import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';

const AllMembership = sequelize.define(
  'AllMembership',
  {
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
    throughResearchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'through_research_entity_id',
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'all_membership',
    schema: 'public',
    timestamps: false,
  }
);

AllMembership.removeAttribute('id');
AllMembership.create = undefined;
AllMembership.update = undefined;
AllMembership.destroy = undefined;

AllMembership.initializeRelations = function (models) {
  AllMembership.belongsTo(models.ResearchEntity, {
    as: 'childResearchEntity',
    foreignKey: 'childResearchEntityId',
  });
  AllMembership.belongsTo(models.ResearchEntity, {
    as: 'parentResearchEntity',
    foreignKey: 'parentResearchEntityId',
  });
};

export async function getAllMembershipsByChildEntityId(researchEntityId) {
  try {
    return await AllMembership.findAll({
      where: {
        childResearchEntityId: researchEntityId,
      },
      include: [
        {
          model: ResearchEntity,
          as: 'parentResearchEntity',
          required: false,
        },
        {
          model: ResearchEntity,
          as: 'childResearchEntity',
          required: false,
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    throw error;
  }
}

export default AllMembership;
