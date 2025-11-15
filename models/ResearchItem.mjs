import _ from 'lodash';
import { DataTypes, Op } from 'sequelize';
import config from '#root/config/config.mjs';
import Affiliation from '#root/models/Affiliation.mjs';
import Author from '#root/models/Author.mjs';
import Duplicate from '#root/models/Duplicate.mjs';
import Institute from '#root/models/Institute.mjs';
import OriginIdentifier from '#root/models/OriginIdentifier.mjs';
import ResearchItemOriginIdentifier from '#root/models/ResearchItemOriginIdentifier.mjs';
import ResearchItemType from '#root/models/ResearchItemType.mjs';
import Blueprint from '#root/services/Blueprint.mjs';
import { errorTypes } from '#root/services/Error.mjs';
import sequelize from '#root/services/Sequelize.mjs';
import getValidator from '#root/services/Validator.mjs';

export async function validateResearchItemData(typeId, data, kind = 'draft') {
  if (!typeId) throw new Error('Missing researchItemType information');
  const result = await ResearchItemType.findByPk(typeId);
  const { type, key } = result;

  let validatorKey = type;
  if (type === 'accomplishment') validatorKey = `${type}_${key}`;

  const validate = getValidator(validatorKey);
  if (!validate)
    throw new Error(`Validator not found for key: ${validatorKey}`);

  if (!validate({ ...data, kind })) {
    throw {
      name: 'validationError',
      message: validate.errors.map((e) => `${e.instancePath} ${e.message}`),
      status: 400,
    };
  }
}

const ResearchItem = sequelize.define(
  'ResearchItem',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    researchItemTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_item_type',
        key: 'id',
      },
      field: 'research_item_type_id',
    },
    creatorResearchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'creator_research_entity_id',
    },
    kind: {
      type: DataTypes.ENUM('draft', 'verified', 'external'),
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'research_item',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'research_item_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

ResearchItem.initializeRelations = function (models) {
  ResearchItem.belongsTo(models.ResearchEntity, {
    as: 'creatorResearchEntity',
    foreignKey: 'creatorResearchEntityId',
  });
  ResearchItem.belongsTo(models.ResearchItemType, {
    as: 'researchItemType',
    foreignKey: 'researchItemTypeId',
  });
  ResearchItem.hasMany(models.Author, {
    as: 'authors',
    foreignKey: 'researchItemId',
  });
  ResearchItem.hasMany(models.Duplicate, {
    as: 'duplicates2',
    foreignKey: 'duplicateId',
  });
  ResearchItem.hasMany(models.Duplicate, {
    as: 'duplicates',
    foreignKey: 'researchItemId',
  });
  ResearchItem.hasMany(models.ResearchItemOriginIdentifier, {
    as: 'researchItemOriginIdentifiers',
    foreignKey: 'researchItemId',
  });
  ResearchItem.hasMany(models.Verified, {
    as: 'verified',
    foreignKey: 'researchItemId',
  });
  ResearchItem.belongsToMany(models.ResearchEntity, {
    through: models.Verified,
    as: 'verifiedResearchEntities',
  });
  ResearchItem.belongsToMany(models.OriginIdentifier, {
    through: models.ResearchItemOriginIdentifier,
    as: 'originIdentifiers',
    foreignKey: 'researchItemId',
    otherKey: 'originIdentifierId',
  });
  ResearchItem.hasMany(models.Suggested, {
    as: 'suggested',
    foreignKey: 'researchItemId',
  });
  ResearchItem.belongsToMany(models.ResearchEntity, {
    through: models.Suggested,
    as: 'suggestedResearchEntities',
  });
};

ResearchItem.getDefaultOrder = function (kind = 'verified') {
  const order = {
    draft: [['updated_at', 'DESC']],
    suggested: [
      ['data.year', 'DESC'],
      ['data.title', 'ASC'],
    ],
    verified: [
      ['data.year', 'DESC'],
      ['data.title', 'ASC'],
    ],
  };

  return order[kind];
};
ResearchItem.getDefaultIncludes = function (kind = 'suggested') {
  const include = {
    suggested: [
      'verifiedResearchEntities',
      {
        association: 'verified',
        include: 'researchEntity',
      },
      'researchItemType',
      'suggested',
      {
        association: 'authors',
        include: [
          {
            association: 'affiliations',
            include: 'institute',
          },
        ],
      },
      {
        association: 'duplicates',
        required: false,
        where: { isDuplicate: true },
        include: [
          {
            association: 'researchItem',
            include: [
              'researchItemType',
              {
                association: 'authors',
                include: [
                  {
                    association: 'affiliations',
                    include: 'institute',
                  },
                ],
              },
              {
                association: 'verified',
                include: 'researchEntity',
              },
            ],
          },
        ],
      },
    ],
    draft: [
      'verified',
      'researchItemType',
      {
        association: 'authors',
        include: [
          {
            association: 'affiliations',
            include: 'institute',
          },
        ],
      },
      {
        association: 'duplicates',
        required: false,
        where: { isDuplicate: true },
        include: [
          {
            association: 'researchItem',
            include: ['researchItemType'],
          },
        ],
      },
    ],
    verified: [
      'verifiedResearchEntities',
      {
        association: 'verified',
        include: ['researchEntity'],
      },
      'researchItemType',
      {
        association: 'authors',
        include: {
          association: 'affiliations',
          include: 'institute',
        },
      },
    ],
  };

  return include[kind];
};

ResearchItem.getWhere = function ({
  kind,
  researchItemId,
  researchEntityId,
  where = {},
}) {
  let defaultWhere;
  const riId = parseInt(researchItemId, 10);
  const reId = parseInt(researchEntityId, 10);

  if (kind === 'draft' && _.isInteger(reId)) {
    defaultWhere = {
      kind,
      creatorResearchEntityId: reId,
    };
  } else if (kind === 'verified' && _.isInteger(reId)) {
    defaultWhere = {
      kind,
      '$verified.researchEntityId$': reId,
    };
  } else if (kind === 'suggested' && _.isInteger(reId)) {
    defaultWhere = {
      kind: { [Op.in]: ['verified', 'external'] },
      '$suggested.researchEntityId$': reId,
    };
  } else
    defaultWhere = {
      kind: 'verified',
    };

  if (_.isInteger(riId)) defaultWhere.id = riId;

  const finalWhere = { ...defaultWhere };

  if (where.search) {
    const searchVal = `%${sequelize.sanitizeLike(where.search)}%`;
    delete finalWhere['data.title'];
    finalWhere[Op.or] = [
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{title}')`),
        { [Op.iLike]: searchVal }
      ),
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{abstract}')`),
        { [Op.iLike]: searchVal }
      ),
      sequelize.where(sequelize.literal(`("ResearchItem"."data"#>>'{doi}')`), {
        [Op.iLike]: searchVal.replace('https://doi.org/', ''),
      }),
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{issuer}')`),
        { [Op.iLike]: searchVal }
      ),
      sequelize.where(sequelize.literal(`("ResearchItem"."data"#>>'{role}')`), {
        [Op.iLike]: searchVal,
      }),
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{eventType}')`),
        { [Op.iLike]: searchVal }
      ),
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{description}')`),
        { [Op.iLike]: searchVal }
      ),
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{event}')`),
        { [Op.iLike]: searchVal }
      ),
    ];
  }

  finalWhere[Op.and] ||= [];

  if (where.discarded)
    finalWhere['$suggested.discarded$'] = {
      [Op.in]: [].concat(where.discarded),
    };

  if (where.year) {
    if (finalWhere['data.year']) delete finalWhere['data.year'];
    finalWhere[Op.and].push(
      sequelize.where(sequelize.literal(`("ResearchItem"."data"#>>'{year}')`), {
        [Op.in]: [].concat(where.year),
      })
    );
  }

  if (where.category) {
    finalWhere[Op.and].push(
      sequelize.safeLiteral(
        '"ResearchItem"."research_item_type_id" IN (SELECT "id" FROM "public"."research_item_type" WHERE "type" IN (:categories))',
        { categories: [].concat(where.category) }
      )
    );
  }

  if (where.type) {
    finalWhere[Op.and].push(
      sequelize.safeLiteral(
        '"ResearchItem"."research_item_type_id" IN (SELECT "id" FROM "public"."research_item_type" WHERE "key" IN (:types))',
        { types: [].concat(where.type) }
      )
    );
  }

  if (where.sourceType) {
    if (where.sourceType.$null === true) {
      finalWhere[Op.and].push(
        sequelize.literal(
          `("ResearchItem"."data"#>>'{sourceType,key}') IS NULL`
        )
      );
    } else {
      if (finalWhere['data.sourceType.key'])
        delete finalWhere['data.sourceType.key'];
      finalWhere[Op.and].push(
        sequelize.where(
          sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,key}')`),
          { [Op.in]: [].concat(where.sourceType) }
        )
      );
    }
  }

  if (where.sourceTitle) {
    if (where.sourceTitle.$null === true) {
      finalWhere[Op.and].push(
        sequelize.literal(`("ResearchItem"."data"#>>'{source,title}') IS NULL`)
      );
    } else {
      if (finalWhere['data.source.title'])
        delete finalWhere['data.source.title'];
      const values = []
        .concat(where.sourceTitle)
        .filter(Boolean)
        .map((v) => sequelize.sanitizeLike(v));
      const ors = values.map((v) =>
        sequelize.where(
          sequelize.literal(`("ResearchItem"."data"#>>'{source,title}')`),
          { [Op.iLike]: `%${v}%` }
        )
      );
      finalWhere[Op.and].push({ [Op.or]: ors });
    }
  }

  if (where.author) {
    const authors = Array.isArray(where.author) ? where.author : [where.author];

    authors.forEach((author) => {
      let mainName = sequelize.clamp(author);
      let flags = null;
      if (author.length > 4 && /^[TF]{4}$/.test(author.slice(-4))) {
        mainName = sequelize.clamp(author.slice(0, -4));
        flags = author.slice(-4);
      }

      finalWhere[Op.and].push(
        sequelize.safeLiteral(
          `"ResearchItem"."id" IN (SELECT "research_item_id" FROM "public"."author" WHERE "name" ILIKE '%' || :mainName || '%' ESCAPE '\\')`,
          { mainName },
          ['mainName']
        )
      );

      if (flags) {
        const conditions = [];
        if (flags[0] === 'T') conditions.push(`"is_oral_presentation" = true`);
        if (flags[1] === 'T')
          conditions.push(`"is_corresponding_author" = true`);
        if (flags[2] === 'T') {
          conditions.push(`"is_first_coauthor" = true`);
          conditions.push(`"position" = 0`);
        }
        if (flags[3] === 'T') {
          conditions.push(`"is_last_coauthor" = true`);
          conditions.push(
            `"position" = (SELECT MAX(a2."position") FROM "public"."author" AS a2 WHERE a2."research_item_id" = "author"."research_item_id")`
          );
        }
        if (conditions.length > 0) {
          finalWhere[Op.and].push(
            sequelize.safeLiteral(
              `"ResearchItem"."id" IN (SELECT "research_item_id" FROM "public"."author" WHERE "name" ILIKE '%' || :mainName || '%' ESCAPE '\\' AND (${conditions.join(' OR ')}))`,
              { mainName },
              ['mainName']
            )
          );
        }
      }
    });
  }

  if (where.verifier) {
    const verifiers = Array.isArray(where.verifier)
      ? where.verifier
      : [where.verifier];
    verifiers.forEach((verifier) => {
      let mainName = sequelize.clamp(verifier);
      finalWhere[Op.and].push(
        sequelize.safeLiteral(
          `"ResearchItem"."id" IN (
           SELECT "research_item_id" FROM "public"."verified" AS v
           INNER JOIN "public"."research_entity" AS re
           ON v."research_entity_id" = re."id"
           WHERE (CASE 
                    WHEN re."type" = 'person'
                    THEN (re."data"#>>'{name}') || ' ' || (re."data"#>>'{surname}')
                    ELSE (re."data"#>>'{name}')
                  END) ILIKE '%' || :mainName || '%' ESCAPE '\\'
           )`,
          { mainName },
          ['mainName']
        )
      );
    });
  }

  return finalWhere;
};

ResearchItem.polishInclude = function (
  filterKey,
  newWhere,
  kind,
  researchEntityId
) {
  const filterWhere = { ...newWhere };
  delete filterWhere[filterKey];
  const freshWhere = ResearchItem.getWhere({
    kind,
    researchEntityId,
    where: filterWhere,
  });
  let filterOptions = Blueprint.fixWhereInclude(freshWhere, []);

  filterOptions.include = Blueprint.removeIncludeAttributes(
    ResearchItem,
    filterOptions.include
  );

  return filterOptions;
};

ResearchItem.createDraft = async function (
  personResearchEntityId,
  rawData,
  transaction
) {
  const researchItemData = {
    kind: 'draft',
    creatorResearchEntityId: personResearchEntityId,
    researchItemTypeId:
      rawData.researchItemTypeId || rawData.researchItemType.id,
    data: {
      ..._.cloneDeep(rawData.data),
      ...(rawData.data?.doi && {
        doi: rawData.data.doi.replace('https://doi.org/', ''),
      }),
    },
  };

  await validateResearchItemData(
    researchItemData.researchItemTypeId,
    researchItemData.data
  );

  const researchItem = await this.create(researchItemData, {
    transaction,
  });
  const updatedAuthors = await Author.updateResearchItemAuthors(
    researchItem.id,
    rawData.authors.map((author) => _.omit(author, ['verifiedId'])),
    transaction
  );
  await Duplicate.calculate({
    researchItemId: researchItem.id,
    researchItemTypeId: researchItem.researchItemTypeId,
    researchEntityId: personResearchEntityId,
    transaction,
  });
  return { researchItem, updatedAuthors };
};

ResearchItem.deleteDraft = async function ({
  researchEntityId,
  researchItemId,
  transaction,
}) {
  const draft = await ResearchItem.findOne({
    where: {
      id: researchItemId,
      kind: 'draft',
      creatorResearchEntityId: researchEntityId,
    },
    transaction,
  });
  if (!draft) {
    throw errorTypes.NotFoundResearchItemError;
  }
  await draft.destroy({ transaction });
};

ResearchItem.updateDraft = async function (
  researchEntityId,
  rawData,
  transaction
) {
  const researchItemId = rawData.id;
  const existingItem = await this.findByPk(researchItemId);

  if (!existingItem) {
    throw {
      success: false,
      name: 'notFoundError',
      message: 'Research item not found',
    };
  }

  const { kind, creatorResearchEntityId } = existingItem;

  if (
    kind !== 'draft' ||
    !(creatorResearchEntityId > 0) ||
    creatorResearchEntityId !== researchEntityId
  ) {
    throw {
      success: false,
      name: 'notFoundError',
      message: 'Research item not found',
    };
  }

  const researchItemData = {
    creatorResearchEntityId,
    researchItemTypeId:
      rawData.researchItemTypeId || rawData.researchItemType.id,
    data: _.cloneDeep(rawData.data),
    kind,
  };
  await validateResearchItemData(
    researchItemData.researchItemTypeId,
    researchItemData.data
  );

  await this.update(researchItemData, {
    where: {
      id: researchItemId,
    },
    transaction,
  });

  await Author.updateResearchItemAuthors(
    researchItemId,
    rawData.authors,
    transaction
  );

  const updatedResearchItem = await this.findOne({
    where: { id: researchItemId },
    include: [
      {
        model: Author,
        as: 'authors',
        include: [
          {
            model: Affiliation,
            as: 'affiliations',
            include: [
              {
                model: Institute,
                as: 'institute',
              },
            ],
          },
        ],
      },
    ],
    transaction,
  });

  await Duplicate.calculate({
    researchItemId: updatedResearchItem.id,
    researchItemTypeId: updatedResearchItem.researchItemTypeId,
    researchEntityId: creatorResearchEntityId,
    cleanOldDuplicates: true,
    transaction,
  });

  return updatedResearchItem;
};

ResearchItem.findExternal = async function (
  { originName = 'open_alex', originIdentifier, doi },
  kind,
  transaction
) {
  if (originIdentifier) {
    const result = await ResearchItem.findOne({
      include: [
        {
          model: OriginIdentifier,
          as: 'originIdentifiers',
          where: { name: originName, identifier: originIdentifier },
          attributes: [],
        },
      ],
      where: { kind },
      transaction,
      subQuery: false,
    });
    return result || null;
  }
  const result = await ResearchItem.findOne({
    where: {
      kind,
      data: {
        doi,
      },
    },
    transaction,
  });
  return result || null;
};

ResearchItem.compareData = function (data1, data2) {
  const cleanData1 = _.cloneDeep(data1);
  const cleanData2 = _.cloneDeep(data2);
  delete cleanData1?.sourceType?.updated_at;
  delete cleanData2?.sourceType?.updated_at;
  delete cleanData1?.sourceType?.created_at;
  delete cleanData2?.sourceType?.created_at;

  return _.isEqualWith(cleanData1, cleanData2, (val1, val2) => {
    if (val1 == null && val2 == null) return true;
  });
};

ResearchItem.upsertExternal = async function (
  originIdentifier,
  authors,
  researchItemData,
  transaction
) {
  const createExternal = async () => {
    researchItemData.kind = 'external';
    const newExternal = await this.create(researchItemData, { transaction });
    const [originRec] = await OriginIdentifier.findOrCreate({
      where: { identifier: originIdentifier },
      defaults: { name: 'open_alex' },
      transaction,
    });
    await ResearchItemOriginIdentifier.create(
      {
        originIdentifierId: originRec.id,
        researchItemId: newExternal.id,
      },
      { transaction }
    );
    await Author.updateResearchItemAuthors(
      newExternal.id,
      authors,
      transaction
    );
    return newExternal;
  };

  const existingExternal = await this.findExternal(
    { originIdentifier },
    'external',
    transaction
  );

  if (existingExternal) {
    const dataChanged = !this.compareData(
      existingExternal.data,
      researchItemData.data
    );

    await Author.updateResearchItemAuthors(
      existingExternal.id,
      authors,
      transaction
    );

    if (dataChanged)
      await existingExternal.update(
        { data: researchItemData.data },
        { transaction }
      );
    return existingExternal;
  }

  const verifiedResearchItem = await this.findExternal(
    { originIdentifier },
    'verified',
    transaction
  );

  if (verifiedResearchItem) {
    const verifiedDataChanged = !this.compareData(
      verifiedResearchItem.data,
      researchItemData.data
    );
    if (!verifiedDataChanged) {
      return verifiedResearchItem;
    }
  }
  return await createExternal();
};

ResearchItem.getFilters = async function ({
  kind,
  researchEntityId,
  where = {},
  authorSearch = '',
  verifierSearch = '',
  sourceTitleSearch = '',
}) {
  if (kind === 'suggested' && where.discarded == null) {
    where.discarded = 'false';
  }
  const newWhere = ResearchItem.getWhere({
    kind,
    researchEntityId,
    where,
  });
  const include = ResearchItem.getDefaultIncludes(kind);
  const options = Blueprint.fixWhereInclude(newWhere, include);
  options.include = Blueprint.removeIncludeAttributes(
    ResearchItem,
    options.include
  );
  const filters = {};
  if (kind === 'suggested') {
    const discardedWhere = { ...options.where };
    delete discardedWhere.discarded;
    if (discardedWhere[Op.and]) {
      discardedWhere[Op.and] = discardedWhere[Op.and].filter(
        (c) => !c?.attribute?.val?.includes('discarded')
      );
    }
    const discardedRes = await ResearchItem.findAll({
      raw: true,
      attributes: [
        [sequelize.literal(`'Discarded'`), 'label'],
        [sequelize.col('suggested.discarded'), 'value'],
        [
          sequelize.fn(
            'COUNT',
            sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
          ),
          'count',
        ],
      ],
      include: options.include,
      where: Object.assign({ '$suggested.discarded$': 'true' }, discardedWhere),
      group: 'suggested.discarded',
    });
    filters.discarded = {
      name: 'discarded',
      label: 'Show discarded only',
      title: 'Show only discarded research items',
      options: discardedRes.map((res) => ({
        value: res.value,
        label: res.label,
        count: res.count,
      })),
    };
  }

  const categoryWhere = { ...options.where };
  delete categoryWhere.type;
  if (categoryWhere[Op.and]) {
    categoryWhere[Op.and] = categoryWhere[Op.and].filter(
      (c) => !c?.val?.includes('research_item_type_id')
    );
  }
  const { include: categoryInclude } = ResearchItem.polishInclude(
    'type',
    newWhere,
    kind,
    researchEntityId
  );
  categoryInclude.push({
    association: 'researchItemType',
    attributes: [],
  });
  const categoryRes = await ResearchItem.findAll({
    raw: true,
    attributes: [
      [sequelize.col('researchItemType.type'), 'value'],
      [sequelize.col('researchItemType.type_label'), 'label'],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
        ),
        'count',
      ],
    ],
    include: categoryInclude,
    where: categoryWhere,
    group: ['researchItemType.type', 'researchItemType.type_label'],
    order: [sequelize.col('researchItemType.type')],
  });
  filters.category = {
    name: 'category',
    label: 'By category',
    options: categoryRes.map((res) => ({
      value: res.value,
      label: res.label,
      count: res.count,
    })),
  };

  const typeWhere = { ...options.where };
  delete typeWhere.type;
  if (typeWhere[Op.and]) {
    typeWhere[Op.and] = typeWhere[Op.and].filter(
      (c) => !c?.val?.includes('research_item_type_id')
    );
  }
  const { include: typeInclude } = ResearchItem.polishInclude(
    'type',
    newWhere,
    kind,
    researchEntityId
  );
  typeInclude.push({
    association: 'researchItemType',
    attributes: [],
  });
  const typeRes = await ResearchItem.findAll({
    raw: true,
    attributes: [
      [sequelize.col('researchItemType.key'), 'value'],
      [sequelize.col('researchItemType.label'), 'label'],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
        ),
        'count',
      ],
    ],
    include: typeInclude,
    where: typeWhere,
    group: ['researchItemType.key', 'researchItemType.label'],
    order: [sequelize.col('researchItemType.key')],
  });
  filters.type = {
    name: 'type',
    label: 'By type',
    options: typeRes.map((res) => ({
      value: res.value,
      label: res.label,
      count: res.count,
    })),
  };

  const sourceTypeWhere = { ...options.where };
  delete sourceTypeWhere.sourceType;
  if (sourceTypeWhere[Op.and]) {
    sourceTypeWhere[Op.and] = sourceTypeWhere[Op.and].filter(
      (c) => !c?.attribute?.val?.includes(`data"#>>'{sourceType`)
    );
  }
  const { include: sourceTypeInclude } = ResearchItem.polishInclude(
    'sourceType',
    newWhere,
    kind,
    researchEntityId
  );
  const sourceTypeRes = await ResearchItem.findAll({
    raw: true,
    attributes: [
      [
        sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,key}')`),
        'value',
      ],
      [
        sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,label}')`),
        'label',
      ],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
        ),
        'count',
      ],
    ],
    include: sourceTypeInclude,
    where: sourceTypeWhere,
    group: [
      sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,key}')`),
      sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,label}')`),
    ],
    order: [sequelize.literal(`("ResearchItem"."data"#>>'{sourceType,key}')`)],
  });
  filters.sourceType = {
    name: 'sourceType',
    label: 'By source type',
    options: sourceTypeRes.map((res) => {
      const key =
        res.value && res.value.trim() !== '' ? res.value : 'Source unavailable';
      const lab =
        res.label && res.label.trim() !== '' ? res.label : 'Source unavailable';
      return {
        value: key,
        label: lab,
        count: res.count,
      };
    }),
  };

  if (sourceTitleSearch.trim().length < 3) {
    filters.sourceTitle = {
      name: 'sourceTitle',
      label: 'By source title',
      options: [],
    };
  } else {
    const sourceTitleWhere = { ...options.where };
    delete sourceTitleWhere.sourceTitle;
    if (sourceTitleWhere[Op.and]) {
      sourceTitleWhere[Op.and] = sourceTitleWhere[Op.and].filter(
        (c) => !c?.attribute?.val?.includes(`#>>'{source,title}'`)
      );
    }
    sourceTitleWhere[Op.and] = sourceTitleWhere[Op.and] || [];
    sourceTitleWhere[Op.and].push(
      sequelize.where(
        sequelize.literal(`("ResearchItem"."data"#>>'{source,title}')`),
        {
          [Op.iLike]: `%${sequelize.sanitizeLike(sourceTitleSearch)}%`,
        }
      )
    );

    const { include: sourceTitleInclude } = ResearchItem.polishInclude(
      'sourceTitle',
      newWhere,
      kind,
      researchEntityId
    );
    const sourceTitleRes = await ResearchItem.findAll({
      raw: true,
      subQuery: false,
      attributes: [
        [
          sequelize.literal(`("ResearchItem"."data"#>>'{source,title}')`),
          'value',
        ],
        [
          sequelize.literal(`("ResearchItem"."data"#>>'{source,title}')`),
          'label',
        ],
        [
          sequelize.fn(
            'COUNT',
            sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
          ),
          'count',
        ],
      ],
      include: sourceTitleInclude,
      where: sourceTitleWhere,
      group: [
        sequelize.literal(`("ResearchItem"."data"#>>'{source,id}')`),
        sequelize.literal(`("ResearchItem"."data"#>>'{source,title}')`),
      ],
      order: [
        [sequelize.literal(`("ResearchItem"."data"#>>'{source,id}')`), 'ASC'],
      ],
      limit: config.queryRowsLimit,
    });
    filters.sourceTitle = {
      name: 'sourceTitle',
      label: 'By source title',
      options: sourceTitleRes.map((res) => {
        return {
          value: res.value,
          label: res.label,
          count: res.count,
        };
      }),
    };
  }

  const yearWhere = { ...options.where };
  delete yearWhere.year;
  if (yearWhere[Op.and]) {
    yearWhere[Op.and] = yearWhere[Op.and].filter(
      (c) => !c?.attribute?.val?.includes(`#>>'{year}'`)
    );
  }
  const { include: yearInclude } = ResearchItem.polishInclude(
    'year',
    newWhere,
    kind,
    researchEntityId
  );
  const yearsRes = await ResearchItem.findAll({
    raw: true,
    attributes: [
      [sequelize.literal(`("ResearchItem"."data"#>>'{year}')`), 'year'],
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
        ),
        'count',
      ],
    ],
    include: yearInclude,
    where: yearWhere,
    group: 'year',
    order: [['year', 'desc']],
  });
  filters.year = {
    name: 'year',
    label: 'By year',
    options: yearsRes.map((res) => ({
      value: res.year,
      label: res.year,
      count: res.count,
    })),
  };

  if (authorSearch.trim().length < 3) {
    filters.authors = {
      name: 'author',
      label: 'By author',
      options: [],
    };
  } else {
    const authorWhere = {};
    if (authorSearch.trim()) {
      authorWhere.name = {
        [Op.iLike]: `%${sequelize.sanitizeLike(authorSearch)}%`,
      };
    }
    const { include: authorInclude } = ResearchItem.polishInclude(
      'author',
      newWhere,
      kind,
      researchEntityId
    );
    authorInclude.push({
      association: 'authors',
      attributes: [],
      duplicating: false,
    });
    const authorsRes = await ResearchItem.findAll({
      raw: true,
      subQuery: false,
      attributes: [
        [sequelize.col('authors.name'), 'value'],
        [
          sequelize.fn(
            'COUNT',
            sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
          ),
          'count',
        ],
      ],
      include: [
        ...authorInclude,
        {
          model: Author,
          as: 'authors',
          attributes: [],
          where: authorWhere,
          required: true,
        },
      ],
      where: options.where,
      group: ['authors.name'],
      order: [[sequelize.col('authors.name'), 'ASC']],
      limit: config.queryRowsLimit,
    });
    filters.authors = {
      name: 'author',
      label: 'By author',
      options: authorsRes.map((r) => ({
        value: r.value,
        label: r.value,
        count: r.count,
      })),
    };
  }

  if (kind === 'verified' || kind === 'suggested') {
    if (verifierSearch.trim().length < 3) {
      filters.verifier = {
        name: 'verifier',
        label: 'Verifier',
        options: [],
      };
    } else {
      const computedName = `
        CASE
          WHEN "verifiedResearchEntities"."type" = 'person'
            THEN ("verifiedResearchEntities"."data"#>>'{name}') || ' ' || ("verifiedResearchEntities"."data"#>>'{surname}')
          ELSE ("verifiedResearchEntities"."data"#>>'{name}')
        END
        `;
      const verifierWhere = { ...options.where };
      if (verifierSearch.trim()) {
        verifierWhere[Op.and] = verifierWhere[Op.and] || [];
        verifierWhere[Op.and].push(
          sequelize.where(sequelize.literal(computedName), {
            [Op.iLike]: `%${sequelize.sanitizeLike(verifierSearch)}%`,
          })
        );
      }
      const { include: verifierInclude } = ResearchItem.polishInclude(
        'verifier',
        newWhere,
        kind,
        researchEntityId
      );
      verifierInclude.push({
        association: 'verifiedResearchEntities',
        attributes: [],
        through: { attributes: [] },
        required: true,
        duplicating: false,
      });
      const verifierRes = await ResearchItem.findAll({
        raw: true,
        subQuery: false,
        attributes: [
          [sequelize.col('verifiedResearchEntities.id'), 'id'],
          [sequelize.col('verifiedResearchEntities.type'), 'type'],
          [sequelize.literal(computedName), 'value'],
          [sequelize.literal(computedName), 'label'],
          [
            sequelize.fn(
              'COUNT',
              sequelize.fn('DISTINCT', sequelize.col('ResearchItem.id'))
            ),
            'count',
          ],
        ],
        include: verifierInclude,
        where: verifierWhere,
        group: [
          sequelize.col('verifiedResearchEntities.id'),
          sequelize.col('verifiedResearchEntities.type'),
          sequelize.literal(computedName),
        ],
        order: [[sequelize.literal(computedName), 'ASC']],
        limit: config.queryRowsLimit,
      });
      filters.verifier = {
        name: 'verifier',
        label: 'Verifier',
        options: verifierRes.map((r) => ({
          value: r.value,
          label: r.label,
          type: r.type,
          count: r.count,
        })),
      };
    }
  }
  return filters;
};

export default ResearchItem;
