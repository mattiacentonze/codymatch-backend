import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('role_permission', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    roleId: {
      type: Sequelize.INTEGER,
      field: 'role_id',
      references: {
        model: 'role',
        key: 'id',
      },
      onDelete: 'cascade',
      allowNull: false,
    },
    permissionId: {
      type: Sequelize.INTEGER,
      field: 'permission_id',
      references: {
        model: 'permission',
        key: 'id',
      },
      onDelete: 'cascade',
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: new Date(),
    },
    updatedAt: {
      type: Sequelize.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: new Date(),
    },
  });

  await queryInterface.addIndex(
    'role_permission',
    ['role_id', 'permission_id'],
    {
      name: 'unique_role_permission',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('role_permission', 'unique_role_permission');
  await queryInterface.dropTable('role_permission');
}
