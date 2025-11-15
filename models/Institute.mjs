import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Institute = sequelize.define(
  'Institute',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    originIds: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'origin_ids',
    },
  },
  {
    tableName: 'institute',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'institute_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Institute.initializeRelations = function (models) {
  Institute.hasMany(models.Affiliation, {
    as: 'affiliations',
    foreignKey: 'instituteId',
  });
};

Institute.updateOrCreate = async function (importedInstitutes, transaction) {
  const institutes = [];
  for (const i of importedInstitutes) {
    const [institute, created] = await Institute.findOrCreate({
      where: { originIds: i.originIds },
      defaults: { name: i.name },
      transaction,
    });
    if (!created && institute.name !== i.name) {
      // TODO avoid keeping updating institute names from italian to english and viceversa
      // console.log('updating institute name', institute.name, '->', i.name);
      // await institute.update({ name: i.name }, { transaction});
    }
    institutes.push(institute);
  }
  return institutes.map((institute) => institute.get({ plain: true }));
};

export default Institute;
