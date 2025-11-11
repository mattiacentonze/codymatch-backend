import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const OriginIdentifier = sequelize.define(
  'OriginIdentifier',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
  },
  {
    tableName: 'origin_identifier',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'origin_identifier_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_origin_identifier',
        unique: true,
        fields: [{ name: 'name' }, { name: 'identifier' }],
      },
    ],
  }
);

OriginIdentifier.initializeRelations = function (models) {
  OriginIdentifier.hasMany(models.Metadata, {
    as: 'metadata',
    foreignKey: 'originIdentifierId',
  });
  OriginIdentifier.hasMany(models.ResearchItemOriginIdentifier, {
    as: 'researchItemOriginIdentifiers',
    foreignKey: 'originIdentifierId',
  });
  OriginIdentifier.belongsToMany(models.ResearchItem, {
    through: models.ResearchItemOriginIdentifier,
    as: 'researchItems',
    foreignKey: 'originIdentifierId',
    otherKey: 'researchItemId',
  });
};

export default OriginIdentifier;
