import _ from 'lodash';
import { DataTypes, Op } from 'sequelize';
import Affiliation from '#root/models/Affiliation.mjs';
import sequelize from '#root/services/Sequelize.mjs';
import { errorTypes } from '#root/services/Error.mjs';

const Author = sequelize.define(
  'Author',
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
      unique: 'author_unique_research_item_position',
      references: {
        model: 'research_item',
        key: 'id',
      },
      field: 'research_item_id',
    },
    verifiedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'verified',
        key: 'id',
      },
      field: 'verified_id',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'author_unique_research_item_position',
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isCorrespondingAuthor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_corresponding_author',
    },
    isFirstCoauthor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_first_coauthor',
    },
    isLastCoauthor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_last_coauthor',
    },
    isOralPresentation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_oral_presentation',
    },
  },
  {
    tableName: 'author',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'author_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'author_unique_research_item_position',
        unique: true,
        fields: ['researchItemId', 'position'],
      },
    ],
  }
);

Author.initializeRelations = function (models) {
  Author.belongsTo(models.ResearchItem, {
    as: 'researchItem',
    foreignKey: 'researchItemId',
  });
  Author.belongsTo(models.Verified, {
    as: 'verified',
    foreignKey: 'verifiedId',
  });
  Author.hasMany(models.Affiliation, {
    as: 'affiliations',
    foreignKey: 'authorId',
  });
};

Author.updateResearchItemAuthors = async function (
  researchItemId,
  authors,
  transaction
) {
  if (!researchItemId || !Array.isArray(authors))
    throw {
      name: errorTypes.ValidationError,
      error: 'wrong authors parameters',
    };

  for (const a of authors) {
    const [author] = await Author.upsert(
      {
        researchItemId,
        position: a.position,
        ..._.omit(a, ['id', 'affiliations', 'researchItemId', 'position']),
      },
      {
        transaction,
        returning: true,
        conflictFields: ['research_item_id', 'position'],
      }
    );

    const newAffiliationIds = (a.affiliations || []).map(
      (aff) => aff.instituteId
    );

    const currentAffiliations = await Affiliation.findAll({
      where: { authorId: author.id },
      transaction,
    });

    const currentAffiliationIds = currentAffiliations.map(
      (aff) => aff.instituteId
    );

    const toRemove = currentAffiliationIds.filter(
      (id) => !newAffiliationIds.includes(id)
    );

    if (toRemove.length > 0) {
      await Affiliation.destroy({
        where: {
          authorId: author.id,
          instituteId: toRemove,
        },
        transaction,
      });
    }

    for (const instituteId of newAffiliationIds) {
      await Affiliation.findOrCreate({
        where: {
          instituteId,
          authorId: author.id,
        },
        transaction,
      });
    }
  }

  await Author.destroy({
    where: {
      researchItemId,
      position: { [Op.notIn]: authors.map((a) => a.position) },
    },
    transaction,
  });
  return authors;
};

export default Author;
