import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('permission', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    key: {
      type: Sequelize.STRING(25),
      allowNull: false,
      unique: true,
    },
    label: {
      type: Sequelize.STRING(25),
      allowNull: false,
    },
    needsResearchEntity: {
      type: Sequelize.BOOLEAN,
      field: 'needs_research_entity',
      defaultValue: false,
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('permission');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_user_account_permission_type";'
  );
}
