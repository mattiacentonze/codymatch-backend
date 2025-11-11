import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('user_account_permission', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    userAccountId: {
      type: Sequelize.INTEGER,
      field: 'user_account_id',
      references: {
        model: 'user_account',
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
    researchEntityId: {
      type: Sequelize.INTEGER,
      field: 'research_entity_id',
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
      allowNull: true,
    },
    type: {
      type: Sequelize.ENUM('granted', 'denied'),
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
    'user_account_permission',
    ['user_account_id', 'permission_id'],
    {
      name: 'unique_user_account_permission',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'user_account_permission',
    'unique_user_account_permission'
  );
  await queryInterface.dropTable('user_account_permission');
}
