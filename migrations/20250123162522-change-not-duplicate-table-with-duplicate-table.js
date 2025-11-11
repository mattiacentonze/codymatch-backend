import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.dropTable('not_duplicate_research_item');
    await queryInterface.createTable('duplicate', {
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
      duplicateId: {
        type: DataTypes.INTEGER,
        field: 'duplicate_id',
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
      isDuplicate: {
        type: DataTypes.BOOLEAN,
        field: 'is_duplicate',
        allowNull: false,
        defaultValue: true,
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
      'duplicate',
      ['research_item_id', 'duplicate_id', 'research_entity_id'],
      {
        name: 'unique_duplicate',
        unique: true,
      }
    );
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.removeIndex('duplicate', 'unique_duplicate');
    await queryInterface.dropTable('duplicate');
    await queryInterface.createTable('not_duplicate_research_item', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      researchEntityId: {
        type: DataTypes.INTEGER,
        field: 'research_entity_id',
        allowNull: true,
        references: {
          model: 'research_entity',
          key: 'id',
        },
        onDelete: 'cascade',
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
      duplicateResearchItemId: {
        type: DataTypes.INTEGER,
        field: 'duplicate_research_item_id',
        allowNull: false,
        references: {
          model: 'research_item',
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
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
