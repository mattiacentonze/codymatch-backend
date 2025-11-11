import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';
import Suggested from '#root/models/Suggested.mjs';

const Alias = sequelize.define(
  'Alias',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'research_entity_id',
    },
    value: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    main: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'alias',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'alias_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_alias',
        unique: true,
        fields: [{ name: 'research_entity_id' }, { name: 'value' }],
      },
    ],
  }
);

Alias.initializeRelations = function (models) {
  Alias.belongsTo(models.ResearchEntity, {
    as: 'researchEntity',
    foreignKey: 'researchEntityId',
  });
};

Alias.getResearchEntityAliases = async function (
  researchEntityId,
  transaction
) {
  return await Alias.findAll({
    where: {
      researchEntityId: researchEntityId,
    },
    transaction,
  });
};

Alias.createDefaultAliases = async function (researchEntityData, transaction) {
  return Alias.create(
    {
      researchEntityId: researchEntityData.id,
      value: `${researchEntityData.data.name} ${researchEntityData.data.surname}`,
      main: true,
    },
    { transaction }
  );
};

// functions to add, update and delete aliases
Alias.addAlias = async function (
  researchEntityId,
  value,
  main = false,
  transaction
) {
  const res = await Alias.create(
    {
      researchEntityId,
      value,
      main,
    },
    {
      transaction,
    }
  );
  await Suggested.calculateAliasSuggestions(researchEntityId, transaction);
  return res;
};

Alias.deleteAlias = async function (id) {
  const transaction = await sequelize.transaction();
  try {
    const alias = await Alias.findByPk(id);
    if (!alias) {
      return {
        success: false,
        message: 'Alias not found',
      };
    }
    const deletedAlias = { ...alias.toJSON() };
    await alias.destroy();
    await Suggested.calculateAliasSuggestions(
      alias.researchEntityId,
      transaction
    );
    await transaction.commit();
    return {
      success: true,
      message: deletedAlias,
    };
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

export default Alias;
