import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('verified', {
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
    isFavorite: {
      type: Sequelize.BOOLEAN,
      field: 'is_favorite',
      allowNull: false,
      defaultValue: false,
    },
    isPublic: {
      type: Sequelize.BOOLEAN,
      field: 'is_public',
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

  await queryInterface.addIndex(
    'verified',
    ['research_item_id', 'research_entity_id'],
    {
      name: 'unique_verified',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('verified', 'unique_verified');
  await queryInterface.dropTable('verified');
}
