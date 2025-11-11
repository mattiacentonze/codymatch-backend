import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'discarded_research_item',
    'unique_discarded_research_item'
  );
  await queryInterface.dropTable('discarded_research_item');
}

export async function down({ context: queryInterface }) {
  await queryInterface.createTable('discarded_research_item', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemId: {
      type: DataTypes.INTEGER,
      field: 'research_item_id',
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    researchEntityId: {
      type: DataTypes.INTEGER,
      field: 'research_entity_id',
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
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
    'discarded_research_item',
    ['research_item_id', 'research_entity_id'],
    {
      name: 'unique_discarded_research_item',
      unique: true,
    }
  );
}
