import _ from 'lodash';
import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import { getValidator } from '#root/services/Validator.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';

const Membership = sequelize.define(
  'Membership',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    parentResearchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'parent_research_entity_id',
    },
    childResearchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'child_research_entity_id',
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'membership',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'membership_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_membership',
        unique: true,
        fields: [
          { name: 'parent_research_entity_id' },
          { name: 'child_research_entity_id' },
          { name: 'type' },
        ],
      },
    ],
  }
);

Membership.initializeRelations = function (models) {
  Membership.belongsTo(models.ResearchEntity, {
    as: 'childResearchEntity',
    foreignKey: 'childResearchEntityId',
  });
  Membership.belongsTo(models.ResearchEntity, {
    as: 'parentResearchEntity',
    foreignKey: 'parentResearchEntityId',
  });
};

export async function getResearchEntityMemberships(
  researchEntityId,
  transaction
) {
  return await Membership.findAll({
    where: {
      childResearchEntityId: researchEntityId,
    },
    include: [
      {
        model: ResearchEntity,
        as: 'parentResearchEntity',
        foreignKey: 'parentResearchEntityId',
        required: false,
      },
    ],
    transaction,
  });
}

Membership.createMemberships = async function (membershipsData, transaction) {
  const validateMembership = getValidator('membership');
  const validateData = getValidator('membershipData');

  for (const md of membershipsData) {
    const membershipData = _.cloneDeep(md);
    if (!membershipsData.data) membershipData.data = {};
    if (!validateData(membershipData.data)) {
      throw {
        name: 'validationError',
        error: validateData.errors,
      };
    }
    if (!validateMembership(membershipData)) {
      throw {
        name: 'validationError',
        error: validateMembership.errors,
      };
    }

    const reversedMembership = await this.findOne({
      where: {
        parentResearchEntityId: membershipData.childResearchEntityId,
        childResearchEntityId: membershipData.parentResearchEntityId,
      },
      transaction,
    });

    if (reversedMembership) continue;

    await this.findOrCreate({
      where: {
        parentResearchEntityId: membershipData.parentResearchEntityId,
        childResearchEntityId: membershipData.childResearchEntityId,
      },
      defaults: { data: membershipData.data },
      transaction,
    });
  }
};

export default Membership;
