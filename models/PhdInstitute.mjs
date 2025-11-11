import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const PhdInstitute = sequelize.define(
  'PhdInstitute',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: 'phd_institute_name_key',
    },
  },
  {
    tableName: 'phd_institute',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'phd_institute_name_key',
        unique: true,
        fields: [{ name: 'name' }],
      },
      {
        name: 'phd_institute_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

PhdInstitute.initializeRelations = function (models) {
  PhdInstitute.hasMany(models.PhdCourse, {
    as: 'phdCourses',
    foreignKey: 'phdInstituteId',
  });
};

export default PhdInstitute;
