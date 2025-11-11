import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('research_item_entity_association', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemId: {
      type: Sequelize.INTEGER,
      field: 'research_item_id',
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      onDelete: 'restrict',
    },
    researchEntityId: {
      type: Sequelize.INTEGER,
      field: 'research_entity_id',
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'restrict',
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
    'research_item_entity_association',
    ['research_item_id', 'research_entity_id'],
    {
      name: 'unique_research_item_entity_association',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'research_item_entity_association',
    'unique_research_item_entity_association'
  );
  await queryInterface.dropTable('research_item_entity_association');
}
