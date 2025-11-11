import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('research_item_type', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    key: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    label: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    shortLabel: {
      type: Sequelize.STRING(10),
      field: 'short_label',
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(
        'publication',
        'invited_talk',
        'accomplishment',
        'project',
        'training_module',
        'patent'
      ),
      allowNull: false,
    },
    typeLabel: {
      type: Sequelize.ENUM(
        'Publication',
        'Invited Talk',
        'Accomplishment',
        'Project',
        'Training Module',
        'Patent'
      ),
      field: 'type_label',
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

  await queryInterface.addIndex('research_item_type', ['key', 'type'], {
    name: 'unique_research_item_type',
    unique: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'research_item_type',
    'unique_research_item_type'
  );
  await queryInterface.dropTable('research_item_type');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_research_item_type_type";'
  );
}
