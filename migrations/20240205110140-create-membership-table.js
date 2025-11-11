import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('membership', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    parentResearchEntityId: {
      type: Sequelize.INTEGER,
      field: 'parent_research_entity_id',
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    childResearchEntityId: {
      type: Sequelize.INTEGER,
      field: 'child_research_entity_id',
      allowNull: false,
      references: {
        model: 'research_entity',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    data: {
      type: Sequelize.JSONB,
      allowNull: true,
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
    'membership',
    ['parent_research_entity_id', 'child_research_entity_id'],
    {
      name: 'unique_membership',
      unique: true,
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('membership', 'unique_membership');
  await queryInterface.dropTable('membership');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_membership_type";'
  );
}
