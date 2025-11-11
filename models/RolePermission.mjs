import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const RolePermission = sequelize.define(
  'RolePermission',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
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
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'permission',
        key: 'id',
      },
      field: 'permission_id',
    },
  },
  {
    tableName: 'role_permission',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'role_permission_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
      {
        name: 'unique_role_permission',
        unique: true,
        fields: [{ name: 'role_id' }, { name: 'permission_id' }],
      },
    ],
  }
);

RolePermission.initializeRelations = function (models) {
  RolePermission.belongsTo(models.Permission, {
    as: 'permission',
    foreignKey: 'permissionId',
  });
  RolePermission.belongsTo(models.Role, {
    as: 'role',
    foreignKey: 'roleId',
  });
};

export default RolePermission;
