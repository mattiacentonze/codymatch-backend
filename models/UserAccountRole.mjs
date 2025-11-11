import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const UserAccountRole = sequelize.define(
  'UserAccountRole',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    userAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_account',
        key: 'id',
      },
      field: 'user_account_id',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'role',
        key: 'id',
      },
      field: 'role_id',
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'research_entity_id',
    },
  },
  {
    tableName: 'user_account_role',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'unique_user_account_role',
        unique: true,
        fields: [{ name: 'user_account_id' }, { name: 'role_id' }],
      },
      {
        name: 'user_account_role_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

UserAccountRole.initializeRelations = function (models) {
  UserAccountRole.belongsTo(models.ResearchEntity, {
    as: 'researchEntity',
    foreignKey: 'researchEntityId',
  });
  UserAccountRole.belongsTo(models.Role, {
    as: 'role',
    foreignKey: 'roleId',
  });
  UserAccountRole.belongsTo(models.UserAccount, {
    as: 'userAccount',
    foreignKey: 'userAccountId',
  });
};

export default UserAccountRole;
