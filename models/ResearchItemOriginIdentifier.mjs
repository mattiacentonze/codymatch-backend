import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const ResearchItemOriginIdentifier = sequelize.define(
  'ResearchItemOriginIdentifier',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    originIdentifierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'origin_identifier',
        key: 'id',
      },
      field: 'origin_identifier_id',
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
  },
  {
    tableName: 'research_item_origin_identifier',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'research_item_origin_identifier_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_research_item_origin_identifier',
        unique: true,
        fields: [
          { name: 'origin_identifier_id' },
          { name: 'research_item_id' },
        ],
      },
    ],
  }
);

ResearchItemOriginIdentifier.initializeRelations = function (models) {
  ResearchItemOriginIdentifier.belongsTo(models.OriginIdentifier, {
    as: 'originIdentifier',
    foreignKey: 'originIdentifierId',
  });
  ResearchItemOriginIdentifier.belongsTo(models.ResearchItem, {
    as: 'researchItem',
    foreignKey: 'researchItemId',
  });
};

export default ResearchItemOriginIdentifier;
