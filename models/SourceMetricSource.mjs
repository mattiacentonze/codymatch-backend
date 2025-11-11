import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const SourceMetricSource = sequelize.define(
  'SourceMetricSource',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    sourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'source',
        key: 'id',
      },
      field: 'source_id',
    },
    sourceMetricId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'source_metric',
        key: 'id',
      },
      field: 'source_metric_id',
    },
  },
  {
    tableName: 'source_metric_source',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'source_metric_source_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

SourceMetricSource.initializeRelations = function (models) {
  SourceMetricSource.belongsTo(models.Source, {
    as: 'source',
    foreignKey: 'sourceId',
  });
  SourceMetricSource.belongsTo(models.SourceMetric, {
    as: 'sourceMetric',
    foreignKey: 'sourceMetricId',
  });
};

export default SourceMetricSource;
