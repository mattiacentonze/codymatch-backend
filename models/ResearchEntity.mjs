import _ from 'lodash';
import { DataTypes, Op } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import { getValidator } from '#root/services/Validator.mjs';
import Membership from '#root/models/Membership.mjs';
import { errorTypes } from '#root/services/Error.mjs';
import Alias from '#root/models/Alias.mjs';
import Blueprint from '#root/services/Blueprint.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';

const ResearchEntity = sequelize.define(
  'ResearchEntity',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('group', 'person'),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    importedData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'imported_data',
    },
  },
  {
    tableName: 'research_entity',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'research_entity_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'research_entity_type_index',
        fields: ['type'],
      },
    ],
  }
);

ResearchEntity.initializeRelations = function (models) {
  ResearchEntity.hasMany(models.Alias, {
    as: 'aliases',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.hasMany(models.Membership, {
    as: 'memberships',
    foreignKey: 'childResearchEntityId',
  });
  ResearchEntity.hasMany(models.Membership, {
    as: 'parentResearchEntityMemberships',
    foreignKey: 'parentResearchEntityId',
  });
  ResearchEntity.hasMany(models.AllMembership, {
    as: 'allMemberships',
    foreignKey: 'childResearchEntityId',
  });
  ResearchEntity.hasMany(models.AllMembership, {
    as: 'allParentResearchEntityMemberships',
    foreignKey: 'parentResearchEntityId',
  });
  ResearchEntity.hasMany(models.Duplicate, {
    as: 'duplicates',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.hasMany(models.ResearchItem, {
    as: 'drafts',
    foreignKey: 'creatorResearchEntityId',
  });
  ResearchEntity.hasMany(models.UserAccountPermission, {
    as: 'userAccountPermissions',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.hasMany(models.UserAccountRole, {
    as: 'userAccountRoles',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.hasMany(models.Verified, {
    as: 'verified',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.belongsToMany(models.ResearchItem, {
    through: models.Verified,
    as: 'verifiedResearchItems',
  });
  ResearchEntity.hasMany(models.Suggested, {
    as: 'suggested',
    foreignKey: 'researchEntityId',
  });
  ResearchEntity.belongsToMany(models.ResearchItem, {
    through: models.Suggested,
    as: 'suggestedResearchItems',
  });
  ResearchEntity.hasOne(models.UserAccount, {
    as: 'account',
    foreignKey: 'username',
    sourceKey: 'code',
  });
};

ResearchEntity.createRE = async function (
  type,
  researchEntityData,
  transaction
) {
  const validateResearchEntity = getValidator('researchEntity');
  const validateData = getValidator(type);
  if (!validateResearchEntity(researchEntityData)) {
    throw {
      name: errorTypes.ValidationError,
      error: validateResearchEntity.errors,
    };
  }
  if (!validateData(researchEntityData.data)) {
    throw {
      name: errorTypes.ValidationError,
      error: validateData.errors,
    };
  }

  const [res] = await this.findOrCreate({
    where: { code: researchEntityData.code },
    defaults: researchEntityData,
    transaction,
  });

  if (res.type === 'person') await Alias.createDefaultAliases(res, transaction);
  return res;
};

ResearchEntity.updateRE = function (type, data, transaction) {
  const validate = getValidator(type);
  const researchEntityData = _.pick(data, Object.keys(this.getAttributes()));
  if (!validate(researchEntityData.data)) {
    throw {
      name: errorTypes.ValidationError,
      error: validate.errors,
    };
  }
  return this.update(
    researchEntityData,
    { where: { id: researchEntityData.id } },
    { transaction }
  );
};

ResearchEntity.updateResearchEntityParentGroups = async function (
  childResearchEntityId,
  groups,
  transaction
) {
  const currentMemberships = await Membership.findAll({
    where: { childResearchEntityId },
    transaction,
  });

  const newMemberships = [];

  for (const g of groups) {
    let group = await this.findOne({
      where: { code: g.code, type: 'group' },
      transaction,
    });
    if (!group) {
      const groupData = {
        type: 'group',
        code: g.code,
        data: {
          code: g.code,
          name: g.name,
          type: g.type,
        },
      };
      group = await this.createRE('simpleGroup', groupData, transaction);
    }
    newMemberships.push({
      parentResearchEntityId: group.id,
      childResearchEntityId,
    });
  }

  const membershipsToAdd = _.differenceBy(
    newMemberships,
    currentMemberships,
    `childResearchEntityId`
  );
  const membershipsToRemove = _.differenceBy(
    currentMemberships,
    newMemberships,
    `childResearchEntityId`
  );

  await Membership.createMemberships(membershipsToAdd, transaction);
  for (const m of membershipsToRemove) await m.destroy({ transaction });
};

ResearchEntity.updateResearchEntityParentGroup = async function (
  childResearchEntityId,
  group,
  transaction
) {
  const currentMemberships = await Membership.findAll({
    where: { childResearchEntityId },
    transaction,
  });

  const newMemberships = [];

  let g = await this.findOne({
    where: { code: group.code, type: 'group' },
    transaction,
  });
  if (!g) {
    const groupData = {
      type: 'group',
      code: group.code,
      data: group.data,
    };
    g = await this.createRE('simpleGroup', groupData, transaction);
  }

  if (childResearchEntityId === g.id) return;

  newMemberships.push({
    parentResearchEntityId: g.id,
    childResearchEntityId,
  });

  const membershipsToAdd = _.differenceBy(
    newMemberships,
    currentMemberships,
    (m) => `${m.parentResearchEntityId}-${m.childResearchEntityId}`
  );

  await Membership.createMemberships(membershipsToAdd, transaction);
};

ResearchEntity.getDefaultIncludes = function (type) {
  const includes = {
    person: [
      {
        association: 'memberships',
        include: [{ association: 'parentResearchEntity' }],
      },
      { association: 'allMemberships' },
    ],
    group: [
      { association: 'parentResearchEntityMemberships' },
      { association: 'allMemberships' },
    ],
  };
  return includes[type] || [];
};

ResearchEntity.getDefaultOrder = function (
  type /* //todo sorting = 'name-a-z'*/
) {
  // currently we only support name-a-z
  if (type === 'person') {
    return [
      [sequelize.literal(`("ResearchEntity"."data"#>>'{surname}')`), 'ASC'],
      [sequelize.literal(`("ResearchEntity"."data"#>>'{name}')`), 'ASC'],
    ];
  }
  return [[sequelize.literal(`("ResearchEntity"."data"#>>'{name}')`), 'ASC']];
};

ResearchEntity.getWhere = function ({ type, parentId, where = {} }) {
  const finalWhere = { ...(type ? { type } : {}) };

  // Parent filter through allMemberships
  if (parentId) {
    finalWhere['$allMemberships.parentResearchEntityId$'] = +parentId;
  }

  // Quick text search
  if (where.search) {
    const q = `%${sequelize.sanitizeLike(where.search)}%`;
    if (type === 'person') {
      finalWhere[Op.or] = [
        sequelize.where(
          sequelize.literal(`("ResearchEntity"."data"#>>'{name}')`),
          { [Op.iLike]: q }
        ),
        sequelize.where(
          sequelize.literal(`("ResearchEntity"."data"#>>'{surname}')`),
          { [Op.iLike]: q }
        ),
        { code: { [Op.iLike]: q } },
      ];
    } else {
      finalWhere[Op.or] = [
        sequelize.where(
          sequelize.literal(`("ResearchEntity"."data"#>>'{name}')`),
          { [Op.iLike]: q }
        ),
        { code: { [Op.iLike]: q } },
      ];
    }
  }

  // Direct memberships only
  if (where.direct) {
    finalWhere['$allMemberships.level$'] = 1;
  }

  // Person -> group filter
  if (type === 'person' && where.group) {
    const list = Array.isArray(where.group) ? where.group : [where.group];
    finalWhere['$memberships.parentResearchEntityId$'] = { [Op.in]: list };
  }

  // Group -> type filter
  if (type === 'group' && where.type) {
    const list = Array.isArray(where.type) ? where.type : [where.type];
    // "data.type" JSON attribute
    finalWhere[Op.and] ||= [];
    finalWhere[Op.and].push(
      sequelize.where(
        sequelize.literal(`("ResearchEntity"."data"#>>'{type}')`),
        { [Op.in]: list }
      )
    );
  }

  return finalWhere;
};

ResearchEntity.getFilters = async function ({
  type,
  parentId,
  where: whereString,
  include: includeString,
}) {
  const parsedWhere = whereString ? JSON.parse(whereString) : {};
  const include = includeString
    ? JSON.parse(includeString)
    : this.getDefaultIncludes(type);

  const queryWhere = this.getWhere({ type, parentId, where: parsedWhere });
  const options = Blueprint.fixWhereInclude(queryWhere, include);
  options.include = Blueprint.removeIncludeAttributes(
    ResearchEntity,
    options.include
  );
  const filters = {};

  const directMemberships = await ResearchEntity.findAll({
    raw: true,
    attributes: [
      [
        sequelize.fn(
          'COUNT',
          sequelize.fn('DISTINCT', sequelize.col('ResearchEntity.id'))
        ),
        'count',
      ],
    ],
    include: options.include,
    where: Object.assign({ '$allMemberships.level$': '1' }, options.where),
    group: [sequelize.col('allMemberships.level')],
  });

  filters.direct = {
    name: 'direct',
    label: 'Show direct relations only',
    title:
      'Show only those memberships where this entity is directly linked (no inherited memberships)',
    options: [
      {
        value: 'true',
        label: 'Direct only',
        count: directMemberships.length ? directMemberships[0].count : 0,
      },
    ],
  };

  if (type === 'person') {
    const results = await ResearchEntity.findAll({
      raw: true,
      attributes: [
        [sequelize.col('memberships.parentResearchEntity.id'), 'value'],
        [
          sequelize.literal(
            `"memberships->parentResearchEntity"."data" #>> '{name}'`
          ),
          'label',
        ],
        [
          sequelize.fn(
            'COUNT',
            sequelize.fn('DISTINCT', sequelize.col('ResearchEntity.id'))
          ),
          'count',
        ],
      ],
      include: options.include,
      where: options.where,
      group: [
        sequelize.col('memberships.parentResearchEntity.id'),
        sequelize.literal(
          `"memberships->parentResearchEntity"."data" #>> '{name}'`
        ),
      ],
      order: [
        sequelize.literal(
          `"memberships->parentResearchEntity"."data" #>> '{name}'`
        ),
      ],
    });

    filters.group = {
      name: 'group',
      label: 'By Group',
      options: results
        .filter((res) => res.value)
        .map((res) => ({
          value: res.value,
          label: res.label,
          count: res.count,
        })),
    };
  } else if (type === 'group') {
    const results = await ResearchEntity.findAll({
      raw: true,
      attributes: [
        [sequelize.literal(`"ResearchEntity"."data" #>> '{type}'`), 'value'],
        [sequelize.literal(`"ResearchEntity"."data" #>> '{type}'`), 'label'],
        [
          sequelize.fn(
            'COUNT',
            sequelize.fn('DISTINCT', sequelize.col('ResearchEntity.id'))
          ),
          'count',
        ],
      ],
      group: sequelize.literal(`"ResearchEntity"."data" #>> '{type}'`),
      order: [sequelize.literal(`"ResearchEntity"."data" #>> '{type}'`)],
      include: options.include,
      where: options.where,
    });

    filters.type = {
      name: 'type',
      label: 'By Type',
      options: results
        .filter((res) => res.value)
        .map((res) => ({
          value: res.value,
          label: res.label,
          count: res.count,
        })),
    };
  }
  return filters;
};

ResearchEntity.getResearchItemCount = async function (kind, id) {
  const include = ResearchItem.getDefaultIncludes(kind);

  const queryWhere = ResearchItem.getWhere({
    kind,
    researchEntityId: id,
  });
  const options = Blueprint.fixWhereInclude(queryWhere, include);

  return await ResearchItem.count({
    ...options,
    distinct: true,
    col: 'id',
  });
};

export default ResearchEntity;
