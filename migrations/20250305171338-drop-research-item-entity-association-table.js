import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.removeIndex('research_item_entity_association', [
    'unique_research_item_entity_association',
    'research_item_entity_association_pkey',
  ]);
  await queryInterface.dropTable('research_item_entity_association');
}

export async function down({ context: queryInterface }) {
  await queryInterface.createTable('research_item_entity_association', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    researchItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      field: 'research_item_id',
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      field: 'research_entity_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: new Date(),
    },
    updatedAt: {
      type: DataTypes.DATE,
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
