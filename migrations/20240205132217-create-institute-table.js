import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('institute', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    city: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    country: {
      type: Sequelize.STRING(75),
      allowNull: true,
    },
    scopusId: {
      type: Sequelize.STRING(75),
      field: 'scopus_id',
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('institute');
}
