import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const PhdCourse = sequelize.define(
  'PhdCourse',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    phdInstituteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'phd_institute',
        key: 'id',
      },
      field: 'phd_institute_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    tableName: 'phd_course',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'phd_course_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_phd_course',
        unique: true,
        fields: [{ name: 'phd_institute_id' }, { name: 'name' }],
      },
    ],
  }
);

PhdCourse.initializeRelations = function (models) {
  PhdCourse.hasMany(models.PhdCycle, {
    as: 'phdCycles',
    foreignKey: 'phdCourseId',
  });
  PhdCourse.belongsTo(models.PhdInstitute, {
    as: 'phdInstitute',
    foreignKey: 'phdInstituteId',
  });
};

export default PhdCourse;
