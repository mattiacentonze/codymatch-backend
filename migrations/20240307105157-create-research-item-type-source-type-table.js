import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('research_item_type_source_type', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    researchItemTypeId: {
      type: Sequelize.INTEGER,
      field: 'research_item_type_id',
      allowNull: false,
      references: {
        model: 'research_item_type',
        key: 'id',
      },
      onDelete: 'restrict',
    },
    sourceTypeId: {
      type: Sequelize.INTEGER,
      field: 'source_type_id',
      allowNull: false,
      references: {
        model: 'source_type',
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('research_item_type_source_type');
}
