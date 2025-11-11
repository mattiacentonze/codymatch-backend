import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'research_item_entity_association',
    'research_item_entity_association_research_entity_id_fkey'
  );
  await queryInterface.removeConstraint(
    'research_item_entity_association',
    'research_item_entity_association_research_item_id_fkey'
  );
  await queryInterface.changeColumn(
    'research_item_entity_association',
    'research_item_id',
    {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      onDelete: 'CASCADE',
    }
  );
  await queryInterface.changeColumn(
    'research_item_entity_association',
    'research_entity_id',
    {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'CASCADE',
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'research_item_entity_association',
    'research_item_entity_association_research_entity_id_fkey'
  );
  await queryInterface.removeConstraint(
    'research_item_entity_association',
    'research_item_entity_association_research_item_id_fkey'
  );
  await queryInterface.changeColumn(
    'research_item_entity_association',
    'research_item_id',
    {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_item',
        key: 'id',
      },
      onDelete: 'NO ACTION',
    }
  );
  await queryInterface.changeColumn(
    'research_item_entity_association',
    'research_entity_id',
    {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'NO ACTION',
    }
  );
}
