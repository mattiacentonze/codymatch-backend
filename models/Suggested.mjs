import _ from 'lodash';
import { DataTypes, Sequelize, Op } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import Duplicate from '#root/models/Duplicate.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import Verified from '#root/models/Verified.mjs';

const Suggested = sequelize.define(
  'Suggested',
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
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'research_entity_id',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    type: {
      type: DataTypes.ENUM(
        'alias',
        'membership',
        'external',
        'manual',
        'other'
      ),
      allowNull: false,
    },
    discarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'suggested',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'suggested_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_suggested',
        unique: true,
        fields: [
          { name: 'research_item_id' },
          { name: 'research_entity_id' },
          { name: 'type' },
        ],
      },
    ],
  }
);

Suggested.initializeRelations = function (models) {
  Suggested.belongsTo(models.ResearchEntity, {
    as: 'researchEntity',
    foreignKey: 'researchEntityId',
  });
  Suggested.belongsTo(models.ResearchItem, {
    as: 'researchItem',
    foreignKey: 'researchItemId',
  });
};

function compareSuggested(a, b) {
  return (
    a.researchItemId === b.researchItemId &&
    a.researchEntityId === b.researchEntityId &&
    a.type === b.type
  );
}

Suggested.calculateResearchItemSuggestions = async function (
  researchItemId,
  researchItemTypeId,
  transaction
) {
  const results = await sequelize.query(
    `
        SELECT al.research_entity_id AS "researchEntityId",
               'alias'               AS type
        FROM research_item ri
                 JOIN author au ON ri.id = au.research_item_id
                 JOIN alias al ON au.name = al.value
        WHERE ri.id = :researchItemId
          AND ri.kind = 'verified'
          AND NOT EXISTS (SELECT *
                          FROM verified v2
                          WHERE v2.research_item_id = ri.id
                            AND v2.research_entity_id = al.research_entity_id)
    `,
    {
      replacements: { researchItemId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  for (const r of results) {
    await Suggested.findOrCreate({
      where: {
        researchItemId,
        researchEntityId: r.researchEntityId,
        type: r.type,
      },
      transaction,
    });
    await Duplicate.calculate({
      researchItemId,
      researchItemTypeId,
      researchEntityId: r.researchEntityId,
      transaction,
    });
  }
};
Suggested.calculateAliasSuggestions = async function (
  researchEntityId,
  transaction
) {
  const result = await sequelize.query(
    `
        SELECT re.id               as "researchEntityId",
               au.research_item_id AS "researchItemId",
               'alias'             AS type
        FROM research_entity re
                 JOIN alias al ON re.id = al.research_entity_id
                 JOIN author au ON au.name = al.value
                 JOIN research_item ri ON au.research_item_id = ri.id
        WHERE re.id = :researchEntityId
          AND ri.kind = 'verified'
          AND NOT EXISTS (SELECT *
                          FROM verified v2
                          WHERE v2.research_item_id = ri.id
                            AND v2.research_entity_id = re.id)
    `,
    {
      replacements: { researchEntityId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  const newSuggested = [].concat(result || []);

  const oldSuggested = await Suggested.findAll(
    { raw: true, where: { researchEntityId, type: 'alias' } },
    { transaction }
  );

  const suggestedToAdd = _.differenceWith(
    newSuggested,
    oldSuggested,
    compareSuggested
  );
  const suggestedToRemove = _.differenceWith(
    oldSuggested,
    newSuggested,
    compareSuggested
  );

  for (const s of suggestedToAdd) {
    await Suggested.findOrCreate({
      where: {
        researchItemId: s.researchItemId,
        researchEntityId,
        type: s.type,
      },
      transaction,
    });

    const { researchItemTypeId } = await ResearchItem.findByPk(
      s.researchItemId,
      { transaction }
    );

    await Duplicate.calculate({
      researchItemId: s.researchItemId,
      researchItemTypeId,
      researchEntityId,
      transaction,
    });
  }

  for (const s of suggestedToRemove)
    await Suggested.removeSuggestions({
      researchEntityId: s.researchEntityId,
      researchItemId: s.researchItemId,
      transaction,
    });
};

Suggested.suggestResearchItems = async function (suggestions, transaction) {
  const flatSuggestions = [].concat(suggestions);
  const researchItemIds = [
    ...new Set(flatSuggestions.map((s) => parseInt(s.researchItemId, 10))),
  ];

  const allVerifications = await Verified.findAll({
    where: {
      researchItemId: {
        [Op.in]: researchItemIds,
      },
    },
    transaction,
  });

  const results = [];
  for (const s of flatSuggestions) {
    const researchItemId = parseInt(s.researchItemId, 10);
    const researchEntityId = parseInt(s.researchEntityId, 10);

    if (!(researchItemId > 0) || !(researchEntityId > 0)) {
      results.push({
        researchItemId,
        researchEntityId,
        success: false,
        message: 'Invalid parameters',
      });
      continue;
    }

    const verificationsForItem = allVerifications.filter(
      (v) => v.researchItemId === researchItemId
    );
    const verifierThisEntity = verificationsForItem.some(
      (v) => v.researchEntityId === researchEntityId
    );
    const verifierOthers = verificationsForItem.length > 0;

    if (verifierThisEntity || !verifierOthers) {
      results.push({
        researchItemId,
        researchEntityId,
        success: false,
        message: verifierThisEntity
          ? 'Already verified by this entity'
          : 'No verifications by other entities',
      });
      continue;
    }

    try {
      await Suggested.findOrCreate({
        where: {
          researchItemId,
          researchEntityId,
          type: 'manual',
        },
        transaction,
      });

      const { researchItemTypeId } = await ResearchItem.findByPk(
        s.researchItemId,
        { transaction }
      );

      await Duplicate.calculate({
        researchItemId: s.researchItemId,
        researchItemTypeId,
        researchEntityId: s.researchEntityId,
        transaction,
      });

      results.push({
        researchItemId,
        researchEntityId,
        success: true,
      });
    } catch (error) {
      results.push({
        researchItemId,
        researchEntityId,
        success: false,
        message: error.message || 'Unknown error during creation',
      });
    }
  }

  return results;
};

Suggested.discard = async function ({
  researchEntityId,
  researchItemId,
  transaction,
}) {
  const ids = Array.isArray(researchItemId) ? researchItemId : [researchItemId];
  const [affectedRows] = await Suggested.update(
    { discarded: true },
    {
      where: {
        researchEntityId,
        researchItemId: { [Op.in]: ids },
      },
      transaction,
    }
  );
  return affectedRows;
};

Suggested.removeSuggestions = async function ({
  researchEntityId,
  researchItemId,
  type,
  transaction,
}) {
  if (typeof researchEntityId !== 'number' || researchEntityId <= 0) return;
  await Suggested.destroy({
    where: {
      researchEntityId,
      ...(researchItemId && { researchItemId }),
      ...(type && { type }),
    },
    transaction,
  });
};

export default Suggested;
