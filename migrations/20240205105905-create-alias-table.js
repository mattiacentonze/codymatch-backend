import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('alias', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchEntityId: {
      type: Sequelize.INTEGER,
      field: 'research_entity_id',
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    value: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    main: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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

  await queryInterface.addIndex('alias', ['research_entity_id', 'value'], {
    name: 'unique_alias',
    unique: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('alias', 'unique_alias');
  await queryInterface.dropTable('alias');
}
