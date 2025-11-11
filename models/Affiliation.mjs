import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Affiliation = sequelize.define(
  'Affiliation',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'affiliation_unique_author_institute',
      references: {
        model: 'author',
        key: 'id',
      },
      field: 'author_id',
    },
    instituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'affiliation_unique_author_institute',
      references: {
        model: 'institute',
        key: 'id',
      },
      field: 'institute_id',
    },
  },
  {
    tableName: 'affiliation',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'affiliation_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'affiliation_unique_author_institute',
        unique: true,
        fields: ['authorId', 'instituteId'],
      },
    ],
  }
);

Affiliation.initializeRelations = function (models) {
  Affiliation.belongsTo(models.Author, {
    as: 'author',
    foreignKey: 'authorId',
  });
  Affiliation.belongsTo(models.Institute, {
    as: 'institute',
    foreignKey: 'instituteId',
  });
};

export default Affiliation;
