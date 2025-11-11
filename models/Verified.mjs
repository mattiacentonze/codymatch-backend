import { DataTypes } from 'sequelize';
import _ from 'lodash';
import sequelize from '#root/services/Sequelize.mjs';
import { getUserInfo } from '#root/services/Session.mjs';
import { validateResearchItemData } from '#root/models/ResearchItem.mjs';
import { errorTypes } from '#root/services/Error.mjs';
import Affiliation from '#root/models/Affiliation.mjs';
import Alias from '#root/models/Alias.mjs';
import Duplicate from '#root/models/Duplicate.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import Suggested from '#root/models/Suggested.mjs';

const Verified = sequelize.define(
  'Verified',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    researchItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      field: 'research_item_id',
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'research_entity_id',
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_favorite',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
  },
  {
    sequelize,
    tableName: 'verified',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'unique_verified',
        unique: true,
        fields: [{ name: 'research_item_id' }, { name: 'research_entity_id' }],
      },
      {
        name: 'verified_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Verified.initializeRelations = function (models) {
  Verified.belongsTo(models.ResearchEntity, {
    as: 'researchEntity',
    foreignKey: 'researchEntityId',
  });
  Verified.belongsTo(models.ResearchItem, {
    as: 'researchItem',
    foreignKey: 'researchItemId',
  });
  Verified.hasMany(models.Author, {
    as: 'authors',
    foreignKey: 'verifiedId',
  });
};

async function handleSetDuplicatesFalse({
  researchItemId,
  researchEntityId,
  transaction,
}) {
  const duplicates = await Duplicate.findAll({
    where: {
      researchItemId,
      researchEntityId,
      isDuplicate: true,
    },
    transaction,
  });

  const toBeRemovedDuplicateIds = duplicates.map((d) => d.duplicateId);

  if (toBeRemovedDuplicateIds?.length > 0) {
    await Duplicate.setDuplicatesFalse(
      toBeRemovedDuplicateIds,
      researchItemId,
      researchEntityId,
      transaction
    );
  }
}

async function handleGetResearchItem(
  researchItemId,
  researchEntityId,
  transaction
) {
  const researchItem = await ResearchItem.findByPk(researchItemId, {
    include: [
      {
        association: 'authors',
        include: 'affiliations',
      },
      {
        association: 'duplicates',
        where: {
          isDuplicate: true,
          researchEntityId,
        },
        required: false,
      },
      {
        association: 'verified',
        include: 'researchEntity',
        required: false,
      },
    ],
    transaction,
  });
  if (!researchItem) {
    throw errorTypes.NotFoundResearchItemError;
  }
  return researchItem;
}

async function handleGetResearchEntity(researchEntityId, transaction) {
  const researchEntity = await ResearchEntity.findByPk(researchEntityId, {
    transaction,
  });
  if (!researchEntity) {
    throw errorTypes.NotFoundResearchEntityError;
  }
  return researchEntity;
}

function getAuthorPositionIfNeeded(
  authorPos,
  researchEntity,
  researchItem,
  req
) {
  if (!_.isNil(authorPos) || researchEntity.type !== 'person') {
    return authorPos; // already have it or not needed
  }
  const aliases = req.session.researchEntities.find(
    (r) => r.type === 'person'
  ).aliases;
  const matchedAuthor = researchItem.authors.find((author) =>
    aliases.some((alias) => alias.value === author.name)
  );
  if (matchedAuthor) {
    return matchedAuthor.position;
  }
  throw errorTypes.VerificationMissingAuthorPositionError;
}

async function verifyAsAuthor({
  author,
  verifiedRecordId,
  isCorrespondingAuthor,
  isOralPresentation,
  isFirstCoauthor,
  isLastCoauthor,
  affiliations,
  transaction,
}) {
  if (!author) throw errorTypes.VerificationMissingAuthorInPositionError;
  if (author.verifiedId) throw errorTypes.VerificationAlreadyVerifiedError;

  author.verifiedId = verifiedRecordId;
  author.isCorrespondingAuthor =
    isCorrespondingAuthor ?? author.isCorrespondingAuthor;
  author.isOralPresentation = isOralPresentation ?? author.isOralPresentation;
  author.isFirstCoauthor = isFirstCoauthor ?? author.isFirstCoauthor;
  author.isLastCoauthor = isLastCoauthor ?? author.isLastCoauthor;

  await author.save({ transaction });

  const hasExistingAffiliations = author.affiliations?.length > 0;
  const hasProvidedAffiliations =
    Array.isArray(affiliations) && affiliations.length > 0;

  if (!hasExistingAffiliations && !hasProvidedAffiliations) {
    throw errorTypes.VerificationMissingAffiliationError;
  }

  if (hasProvidedAffiliations) {
    for (const affiliation of affiliations) {
      await Affiliation.findOrCreate({
        where: {
          instituteId: affiliation.instituteId,
          authorId: author.id,
        },
        transaction,
      });
    }
  }
}

async function addAliasIfNeeded({
  researchEntityId,
  author,
  req,
  transaction,
}) {
  const aliases = req.session.researchEntities.find(
    (r) => r.type === 'person'
  ).aliases;
  const aliasNames = aliases.map((a) => a.value);
  if (!aliasNames.includes(author.name)) {
    await Alias.addAlias(researchEntityId, author.name, false, transaction);
    await getUserInfo(req, req.session.user.id, true, transaction);
  }
}

async function markResearchItemAsVerified(researchItem, transaction) {
  if (researchItem.kind === 'draft') {
    researchItem.kind = 'verified';
    researchItem.creatorResearchEntityId = null;
    await researchItem.save({ transaction });

    await Suggested.calculateResearchItemSuggestions(
      researchItem.id,
      researchItem.researchItemTypeId,
      transaction
    );
  } else if (researchItem.kind === 'external') {
    researchItem.kind = 'verified';
    await researchItem.save({ transaction });
  }
}

async function checkIfAlreadyVerified({
  researchItem,
  researchEntityId,
  transaction,
}) {
  if (researchItem.kind !== 'verified') return;

  const existingVerify = await Verified.findOne({
    where: {
      researchItemId: researchItem.id,
      researchEntityId,
    },
    transaction,
  });

  if (existingVerify) {
    throw errorTypes.VerificationAlreadyVerifiedError;
  }
}

Verified.VerifyResearchItem = async function ({
  researchItemId,
  researchEntityId,
  researchItemTypeId,
  authorPosition,
  affiliations,
  isCorrespondingAuthor,
  isOralPresentation,
  isFirstCoauthor,
  isLastCoauthor,
  setDuplicatesFalse = false,
  req,
  transaction,
}) {
  let authorPos = authorPosition;
  const suggested = await Suggested.findOne({
    where: {
      researchItemId,
      researchEntityId,
    },
    transaction,
  });

  if (!suggested) {
    await Duplicate.calculate({
      researchItemId,
      researchItemTypeId,
      researchEntityId,
      transaction,
    });
  }

  if (setDuplicatesFalse) {
    await handleSetDuplicatesFalse({
      researchItemId,
      researchEntityId,
      transaction,
    });
  }

  const researchItem = await handleGetResearchItem(
    researchItemId,
    researchEntityId,
    transaction
  );
  await validateResearchItemData(
    researchItem.researchItemTypeId,
    researchItem.data,
    'verified'
  );

  const researchEntity = await handleGetResearchEntity(
    researchEntityId,
    transaction
  );

  await checkIfAlreadyVerified({
    researchItem,
    researchEntityId,
    transaction,
  });

  authorPos = getAuthorPositionIfNeeded(
    authorPos,
    researchEntity,
    researchItem,
    req
  );

  if (researchItem?.duplicates?.length > 0)
    throw errorTypes.VerificationIsDuplicateError;

  const verifiedRecord = await Verified.create(
    {
      researchItemId: researchItem.id,
      researchEntityId,
    },
    { transaction }
  );
  if (!verifiedRecord) throw errorTypes.VerificationError;

  if (researchEntity.type === 'person') {
    if (
      researchItem.kind === 'draft' &&
      researchItem.creatorResearchEntityId !== researchEntityId
    )
      throw errorTypes.VerificationNotDraftCreatorError;

    const author = researchItem.authors.find((a) => a.position === authorPos);
    await verifyAsAuthor({
      author,
      verifiedRecordId: verifiedRecord.id,
      isCorrespondingAuthor,
      isOralPresentation,
      isFirstCoauthor,
      isLastCoauthor,
      affiliations,
      transaction,
    });
    await addAliasIfNeeded({
      researchEntityId,
      author,
      req,
      transaction,
    });
  }

  await markResearchItemAsVerified(researchItem, transaction);

  await Duplicate.calculate({
    researchItemId: researchItem.id,
    researchItemTypeId: researchItem.researchItemTypeId,
    researchEntityId,
    calculateOn: 'draftAndSuggested',
    transaction,
  });

  await Suggested.removeSuggestions({
    researchEntityId: researchEntityId,
    researchItemId: researchItem.id,
    transaction,
  });
};

Verified.unverify = async function ({
  researchEntityId,
  researchItemId,
  transaction,
}) {
  const reId = parseInt(researchEntityId, 10);
  const riId = parseInt(researchItemId, 10);
  if (!(reId > 0) || !(riId > 0)) throw errorTypes.ValidationError;

  const res = await Verified.destroy({
    where: { researchEntityId: reId, researchItemId: riId },
    transaction,
  });

  if (res === 0) throw errorTypes.UnverificationAlreadyVerifiedError;

  // update the corresponding suggested entry or create it if it doesn't exist
  const existingSuggested = await Suggested.findOne({
    where: {
      researchEntityId: reId,
      researchItemId: riId,
    },
    transaction,
  });

  if (existingSuggested) {
    await Suggested.update(
      { discarded: true },
      {
        where: {
          researchEntityId: reId,
          researchItemId: riId,
        },
        transaction,
      }
    );
  } else {
    await Suggested.create(
      {
        researchEntityId: reId,
        researchItemId: riId,
        type: 'manual',
        discarded: true,
      },
      { transaction }
    );
  }

  await Duplicate.destroy({
    where: {
      duplicateId: riId,
      researchEntityId: reId,
    },
    transaction,
  });

  const verificationCount = await Verified.count({
    where: { researchItemId: riId },
    transaction,
  });

  if (verificationCount === 0) {
    await ResearchItem.destroy({
      where: { id: riId },
      transaction,
    });
  }
};

export default Verified;
