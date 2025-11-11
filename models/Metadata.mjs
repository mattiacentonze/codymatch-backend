import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Metadata = sequelize.define(
  'Metadata',
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
    name: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'metadata',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'metadata_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Metadata.initializeRelations = function (models) {
  Metadata.belongsTo(models.OriginIdentifier, {
    as: 'originIdentifier',
    foreignKey: 'originIdentifierId',
  });
};

export default Metadata;
