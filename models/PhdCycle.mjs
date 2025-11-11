import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const PhdCycle = sequelize.define(
  'PhdCycle',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    phdCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'phd_course',
        key: 'id',
      },
      field: 'phd_course_id',
    },
    name: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
  },
  {
    tableName: 'phd_cycle',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'phd_cycle_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_phd_cycle',
        unique: true,
        fields: [{ name: 'phd_course_id' }, { name: 'name' }],
      },
    ],
  }
);

PhdCycle.initializeRelations = function (models) {
  PhdCycle.belongsTo(models.PhdCourse, {
    as: 'phdCourse',
    foreignKey: 'phdCourseId',
  });
};

export default PhdCycle;
