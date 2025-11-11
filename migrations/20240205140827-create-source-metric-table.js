import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('source_metric', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    origin: {
      type: Sequelize.STRING(10),
      allowNull: false,
    },
    sourceOriginId: {
      type: Sequelize.STRING(15),
      field: 'source_origin_id',
      allowNull: true,
    },
    issn: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    eissn: {
      type: Sequelize.STRING(25),
      allowNull: true,
    },
    sourceTitle: {
      type: Sequelize.STRING(400),
      field: 'source_title',
      allowNull: false,
    },
    year: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(15),
      allowNull: false,
    },
    value: {
      type: Sequelize.STRING(25),
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
  await queryInterface.dropTable('source_metric');
}
