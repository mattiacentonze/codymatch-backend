import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('research_item', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemTypeId: {
      type: DataTypes.INTEGER,
      field: 'research_item_type_id',
      allowNull: false,
      references: {
        model: 'research_item_type',
        key: 'id',
      },
      onDelete: 'restrict',
    },
    creatorResearchEntityId: {
      type: DataTypes.INTEGER,
      field: 'creator_research_entity_id',
      allowNull: true,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    kind: {
      type: DataTypes.ENUM('draft', 'verified', 'external'),
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('research_item');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_research_item_kind";'
  );
}
