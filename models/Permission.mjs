import { DataTypes } from 'sequelize';
import sequelize from '#root/services/Sequelize.mjs';

const Permission = sequelize.define(
  'Permission',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: 'permission_key_key',
    },
    label: {
      type: DataTypes.STRING(25),
      allowNull: false,
    },
    needsResearchEntity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'needs_research_entity',
    },
    parent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'permission',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  },
  {
    tableName: 'permission',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'permission_key_key',
        unique: true,
        fields: [{ name: 'key' }],
      },
      {
        name: 'permission_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Permission.initializeRelations = function (models) {
  Permission.hasMany(models.RolePermission, {
    as: 'rolePermissions',
    foreignKey: 'permissionId',
  });
  Permission.hasMany(models.UserAccountPermission, {
    as: 'userAccountPermissions',
    foreignKey: 'permissionId',
  });
  Permission.belongsTo(Permission, {
    as: 'parentPermission',
    foreignKey: 'parent',
  });
  Permission.hasMany(Permission, {
    as: 'childPermissions',
    foreignKey: 'parent',
  });
};

export default Permission;
