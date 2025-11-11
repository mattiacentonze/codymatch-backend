import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('suggested', {
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
    type: {
      type: DataTypes.ENUM(
        'alias',
        'membership',
        'external',
        'manual',
        'other'
      ),
      allowNull: false,
    },
    discarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    'suggested',
    ['research_item_id', 'research_entity_id', 'type'],
    {
      name: 'unique_suggested',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('suggested', 'unique_suggested');
  await queryInterface.dropTable('suggested');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_suggested_type";'
  );
}
