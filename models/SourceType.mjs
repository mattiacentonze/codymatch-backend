import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const SourceType = sequelize.define(
  'SourceType',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: 'source_type_key_key',
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    tableName: 'source_type',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'source_type_key_key',
        unique: true,
        fields: [{ name: 'key' }],
      },
      {
        name: 'source_type_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

SourceType.initializeRelations = function (models) {
  SourceType.hasMany(models.ResearchItemTypeSourceType, {
    as: 'researchItemTypeSourceTypes',
    foreignKey: 'sourceTypeId',
  });
  SourceType.hasMany(models.Source, {
    as: 'sources',
    foreignKey: 'sourceTypeId',
  });
};

SourceType.seed = async function () {
  const count = await this.count();
  if (count > 0) return;

  const initialData = [
    {
      key: 'book',
      label: 'Book',
    },
    {
      key: 'journal',
      label: 'Journal',
    },
    {
      key: 'conference',
      label: 'Conference',
    },
    {
      key: 'book_series',
      label: 'Book Series',
    },
    {
      key: 'eprint_archive',
      label: 'E-print Archive',
    },
  ];

  await this.bulkCreate(initialData);
};

export default SourceType;
