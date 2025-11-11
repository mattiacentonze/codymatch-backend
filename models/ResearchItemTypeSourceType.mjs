import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const ResearchItemTypeSourceType = sequelize.define(
  'ResearchItemTypeSourceType',
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
    sourceTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'source_type',
        key: 'id',
      },
      field: 'source_type_id',
    },
  },
  {
    tableName: 'research_item_type_source_type',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'research_item_type_source_type_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

ResearchItemTypeSourceType.initializeRelations = function (models) {
  ResearchItemTypeSourceType.belongsTo(models.ResearchItemType, {
    as: 'researchItemType',
    foreignKey: 'researchItemTypeId',
  });
  ResearchItemTypeSourceType.belongsTo(models.SourceType, {
    as: 'sourceType',
    foreignKey: 'sourceTypeId',
  });
};

export default ResearchItemTypeSourceType;
