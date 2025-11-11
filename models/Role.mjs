import { DataTypes } from 'sequelize';
import Permission from '#root/models/Permission.mjs';
import RolePermission from '#root/models/RolePermission.mjs';
import sequelize from '#root/services/Sequelize.mjs';

const Role = sequelize.define(
  'Role',
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
      unique: 'role_key_key',
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
  },
  {
    tableName: 'role',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'role_key_key',
        unique: true,
        fields: [{ name: 'key' }],
      },
      {
        name: 'role_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

Role.initializeRelations = function (models) {
  Role.hasMany(models.RolePermission, {
    as: 'rolePermissions',
    foreignKey: 'roleId',
  });

  Role.hasMany(models.UserAccountRole, {
    as: 'userAccountRoles',
    foreignKey: 'roleId',
  });
};

Role.seed = async function () {
  const count = await this.count();
  if (count > 0) return;

  const permissionCount = await Permission.count();
  if (permissionCount === 0) {
    await Permission.bulkCreate([
      {
        id: 1,
        key: 'all_read',
        label: 'All read',
      },
      {
        id: 2,
        key: 'all_write',
        label: 'All write',
      },
      {
        id: 3,
        key: 'research_entity_write',
        label: 'Research Entity write',
        needsResearchEntity: true,
        parent: 2,
      },
      {
        id: 4,
        key: 'research_entity_read',
        label: 'Research Entity read',
        needsResearchEntity: true,
        parent: 1,
      },
      {
        id: 5,
        key: 'item_read',
        label: 'Item read',
        needsResearchEntity: true,
        parent: 4,
      },
      {
        id: 6,
        key: 'settings_read',
        label: 'Settings read',
        needsResearchEntity: true,
        parent: 4,
      },
      {
        id: 7,
        key: 'item_write',
        label: 'Item write',
        needsResearchEntity: true,
        parent: 3,
      },
      {
        id: 8,
        key: 'settings_write',
        label: 'Settings write',
        needsResearchEntity: true,
        parent: 3,
      },
    ]);
  }

  const [admin, groupOwner, personOwner] = await Role.bulkCreate([
    { key: 'admin', label: 'Administrator' },
    { key: 'group_owner', label: 'Group owner', needsResearchEntity: true },
    { key: 'person_owner', label: 'Person owner', needsResearchEntity: true },
  ]);

  const permissions = await Permission.findAll({
    where: {
      key: [
        'all_write',
        'all_read',
        'research_entity_write',
        'research_entity_read',
      ],
    },
  });

  const permissionsMap = Object.fromEntries(permissions.map((p) => [p.key, p]));

  await RolePermission.bulkCreate([
    {
      roleId: admin.id,
      permissionId: permissionsMap['all_write'].id,
    },
    {
      roleId: admin.id,
      permissionId: permissionsMap['all_read'].id,
    },
    {
      roleId: groupOwner.id,
      permissionId: permissionsMap['research_entity_write'].id,
    },
    {
      roleId: groupOwner.id,
      permissionId: permissionsMap['research_entity_read'].id,
    },
    {
      roleId: personOwner.id,
      permissionId: permissionsMap['research_entity_write'].id,
    },
    {
      roleId: personOwner.id,
      permissionId: permissionsMap['research_entity_read'].id,
    },
  ]);
};

export default Role;
