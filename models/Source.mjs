import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Source = sequelize.define(
  'Source',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
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
    title: {
      type: DataTypes.STRING(600),
      allowNull: false,
    },
    issn: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    originIds: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'origin_ids',
    },
  },
  {
    tableName: 'source',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'source_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'source_origin_open_alex_unique',
        unique: true,
        fields: [{ name: 'origin_ids', attribute: 'open_alex_id' }],
      },
    ],
  }
);

Source.initializeRelations = function (models) {
  Source.hasMany(models.SourceMetricSource, {
    as: 'sourceMetricSources',
    foreignKey: 'sourceId',
  });
  Source.belongsTo(models.SourceType, {
    as: 'sourceType',
    foreignKey: 'sourceTypeId',
  });
};

Source.customUpsert = async function (importedSource, transaction) {
  const query = `
      INSERT INTO source ("source_type_id", "title", "issn", "origin_ids", "created_at", "updated_at")
      VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW(), NOW())
      ON CONFLICT ((origin_ids ->> 'open_alex_id'))
          DO UPDATE SET "issn"           = EXCLUDED."issn",
                        "title"          = EXCLUDED."title",
                        "origin_ids"     = EXCLUDED."origin_ids",
                        "source_type_id" = EXCLUDED."source_type_id",
                        "updated_at"     = NOW()
      RETURNING *;
  `;

  const values = [
    importedSource.sourceTypeId,
    importedSource.title,
    importedSource.issn ? JSON.stringify(importedSource.issn) : null,
    JSON.stringify(importedSource.originIds),
  ];

  const [result] = await sequelize.query(query, {
    bind: values,
    transaction,
    model: Source,
    mapToModel: true,
  });

  return result.dataValues;
};

export default Source;
