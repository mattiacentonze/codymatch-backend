import { DataTypes, Op, QueryTypes } from 'sequelize';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';
import Role from '#root/models/Role.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';
import sequelize from '#root/services/Sequelize.mjs';

const Duplicate = sequelize.define(
  'Duplicate',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemId: {
      type: DataTypes.INTEGER,
      field: 'research_item_id',
      allowNull: false,
      references: { model: 'research_item', key: 'id' },
    },
    duplicateId: {
      type: DataTypes.INTEGER,
      field: 'duplicate_id',
      allowNull: false,
      references: { model: 'research_item', key: 'id' },
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      field: 'research_entity_id',
      allowNull: false,
      references: { model: 'research_entity', key: 'id' },
    },
    isDuplicate: {
      type: DataTypes.BOOLEAN,
      field: 'is_duplicate',
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'duplicate',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'duplicate_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_duplicate',
        unique: true,
        fields: [
          { name: 'research_item_id' },
          { name: 'duplicate_id' },
          { name: 'research_entity_id' },
        ],
      },
    ],
  }
);

Duplicate.initializeRelations = function (models) {
  Duplicate.belongsTo(models.ResearchItem, {
    as: 'researchItem2',
    foreignKey: 'researchItemId',
  });
  Duplicate.belongsTo(models.ResearchItem, {
    as: 'researchItem',
    foreignKey: 'duplicateId',
  });
  Duplicate.belongsTo(models.ResearchEntity, {
    as: 'researchEntity',
    foreignKey: 'researchEntityId',
  });
};

async function getGroupEntityIds(researchEntityId, transaction) {
  const personal = await ResearchEntity.findOne({
    where: { id: researchEntityId },
    include: [
      {
        model: UserAccount,
        as: 'account',
        required: true,
        attributes: ['id'],
        include: [
          {
            model: UserAccountRole,
            as: 'userAccountRoles',
            required: true,
            attributes: ['researchEntityId'],
            include: [
              {
                model: Role,
                as: 'role',
                where: { key: 'group_owner' },
                attributes: ['id'],
              },
            ],
          },
        ],
      },
    ],
    attributes: [],
    transaction,
  });

  return (
    personal?.account?.userAccountRoles?.map((r) => r.researchEntityId) ?? []
  );
}

async function buildDuplicateQuery({
  researchItemId,
  researchItemTypeId,
  researchEntityId,
  entityIds,
  calculateOn = 'verified',
}) {
  const CV = `
    WITH constant_values AS (
      SELECT opt.research_item_id,
             oi.identifier             AS origin_id,
             opt.doi                   AS doi,
             opt.title_string          AS title_string,
             opt.title_string_length   AS title_string_length,
             opt.authors_string        AS authors_string,
             opt.authors_string_length AS authors_string_length,
             opt.event_string          AS event_string,
             opt.event_string_length   AS event_string_length,
             opt.year                  AS year,
             opt.sub_type              AS sub_type,
             opt.application_number    AS application_number,
             opt.filing_date           AS filing_date,
             opt.patent_number         AS patent_number,
             opt.issue_date            AS issue_date
      FROM duplicate_search_optimization opt
      LEFT JOIN research_item_origin_identifier rioi
        ON opt.research_item_id = rioi.research_item_id
      LEFT JOIN origin_identifier oi
        ON rioi.origin_identifier_id = oi.id
       AND oi.name = 'open_alex'
      WHERE opt.research_item_id = :researchItemId
      GROUP BY opt.research_item_id, oi.identifier, opt.doi,
               opt.title_string, opt.title_string_length,
               opt.authors_string, opt.authors_string_length,
               opt.event_string, opt.event_string_length,
               opt.year, opt.sub_type,
               opt.application_number, opt.filing_date,
               opt.patent_number, opt.issue_date
    )
  `;

  const CANDIDATES =
    calculateOn === 'verified'
      ? `,
    candidates AS (
      SELECT DISTINCT v.research_item_id AS id,
             v.research_entity_id        AS research_entity_id
      FROM verified v
      JOIN research_item ri ON ri.id = v.research_item_id
      WHERE v.research_entity_id IN (:entityIds)
        AND ri.research_item_type_id = :researchItemTypeId
        AND ri.id <> :researchItemId
    )`
      : `,
    draft_candidates AS (
      SELECT id, :researchEntityId::int AS research_entity_id
      FROM research_item
      WHERE kind = 'draft'
        AND creator_research_entity_id = :researchEntityId
        AND research_item_type_id = :researchItemTypeId
        AND id <> :researchItemId
    ),
    suggested_candidates AS (
      SELECT ri.id, :researchEntityId::int AS research_entity_id
      FROM suggested s
      JOIN research_item ri ON ri.id = s.research_item_id
      WHERE s.research_entity_id = :researchEntityId
        AND s.discarded = false
        AND ri.research_item_type_id = :researchItemTypeId
        AND ri.id <> :researchItemId
    ),
    candidates AS (
      SELECT DISTINCT id, research_entity_id FROM draft_candidates
      UNION
      SELECT DISTINCT id, research_entity_id FROM suggested_candidates
    )`;

  const CI = `,
    candidate_items AS (
      SELECT
        c.research_entity_id,
        ri.id                      AS research_item_id,
        oi.identifier              AS origin_id,
        dso.doi                    AS doi,
        dso.title_string           AS title_string,
        dso.title_string_length    AS title_string_length,
        dso.authors_string         AS authors_string,
        dso.authors_string_length  AS authors_string_length,
        dso.event_string           AS event_string,
        dso.event_string_length    AS event_string_length,
        dso.year                   AS year,
        dso.sub_type               AS sub_type,
        dso.application_number     AS application_number,
        dso.filing_date            AS filing_date,
        dso.patent_number          AS patent_number,
        dso.issue_date             AS issue_date        
      FROM candidates c
      JOIN research_item ri ON ri.id = c.id
      JOIN duplicate_search_optimization dso ON dso.research_item_id = ri.id
      LEFT JOIN research_item_origin_identifier rioi
        ON rioi.research_item_id = ri.id
      LEFT JOIN origin_identifier oi
        ON rioi.origin_identifier_id = oi.id
       AND oi.name = 'open_alex'
    )
  `;

  const { type: researchItemTypeType, key: researchItemType } =
    await ResearchItemType.findByPk(researchItemTypeId);
  const where = ResearchItemType.getDuplicateWhere(
    researchItemTypeType,
    researchItemType
  );
  const typeReplacements = ResearchItemType.getDuplicateReplacements(
    researchItemTypeType,
    researchItemType
  );

  const replacements = {
    researchItemId,
    researchItemTypeId,
    researchEntityId,
    entityIds,
    ...typeReplacements,
  };

  let query = '';
  if (calculateOn === 'draftAndSuggested')
    query = `
      ${CV}
      ${CANDIDATES}
      ${CI}
      SELECT ci.research_entity_id,
             ci.research_item_id AS research_item_id,
             cv.research_item_id AS duplicate_id
      FROM candidate_items ci
             CROSS JOIN constant_values cv
      WHERE ${where};
    `;
  else if (calculateOn === 'verified')
    query = `
      ${CV}
      ${CANDIDATES}
      ${CI}
      SELECT ci.research_entity_id,
             ci.research_item_id AS duplicate_id,
             cv.research_item_id AS research_item_id
      FROM candidate_items ci
             CROSS JOIN constant_values cv
      WHERE ${where};
    `;

  return { query, replacements };
}

Duplicate.calculate = async function ({
  researchItemId,
  researchItemTypeId,
  researchEntityId,
  calculateOn = 'verified', // 'verified' | 'draftAndSuggested'
  cleanOldDuplicates = false,
  transaction,
}) {
  let riTypeId = researchItemTypeId;
  if (!riTypeId) {
    const record = await ResearchItem.findByPk(researchItemId, { transaction });
    riTypeId = record.researchItemTypeId;
  }
  let groupResearchEntityIds = [];
  if (calculateOn === 'verified')
    groupResearchEntityIds = await getGroupEntityIds(
      researchEntityId,
      transaction
    );
  const entityIds = [researchEntityId, ...groupResearchEntityIds];

  const { query, replacements } = await buildDuplicateQuery({
    researchItemId,
    researchItemTypeId: riTypeId,
    researchEntityId,
    calculateOn,
    entityIds,
  });

  if (!query) return [];

  if (cleanOldDuplicates && calculateOn === 'verified')
    await Duplicate.delete(researchItemId, entityIds, transaction);

  const duplicates = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
    transaction,
  });

  for (const duplicate of duplicates)
    await Duplicate.updateOrCreate(
      duplicate.research_item_id,
      duplicate.duplicate_id,
      duplicate.research_entity_id,
      true,
      transaction
    );

  return duplicates;
};

Duplicate.updateOrCreate = async function (
  researchItemId,
  duplicateId,
  researchEntityId,
  isDuplicate,
  transaction
) {
  const [duplicate, created] = await Duplicate.findOrCreate({
    where: { researchItemId, duplicateId, researchEntityId },
    ...(isDuplicate && { defaults: { isDuplicate } }),
    transaction,
  });

  if (!created) {
    if (!duplicate.isDuplicate) return duplicate;
    duplicate.isDuplicate = isDuplicate;
    await duplicate.save({ transaction });
  }
  return duplicate;
};

Duplicate.delete = async function (researchItemId, entityIds, transaction) {
  const where = { researchItemId };
  if (Array.isArray(entityIds) && entityIds.length) {
    where.researchEntityId = { [Op.in]: entityIds };
  } else if (entityIds) {
    where.researchEntityId = entityIds;
  }
  await Duplicate.destroy({ where, transaction });
};

Duplicate.setDuplicatesFalse = async function (
  duplicates,
  researchItemId,
  researchEntityId,
  transaction
) {
  const result = { success: true, updates: [] };
  for (let duplicateId of duplicates) {
    try {
      await Duplicate.updateOrCreate(
        researchItemId,
        duplicateId,
        researchEntityId,
        false,
        transaction
      );
      result.updates.push({
        duplicateId,
        success: true,
        message: `Duplicate with ID ${duplicateId} updated successfully`,
      });
    } catch (_error) {
      result.success = false;
      result.updates.push({
        duplicateId,
        success: false,
        message: `Failed update duplicate with ID ${duplicateId}`,
      });
    }
  }
  return result;
};

export default Duplicate;
