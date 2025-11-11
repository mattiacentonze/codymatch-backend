import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('source', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
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
    title: {
      type: Sequelize.STRING(600),
      allowNull: false,
    },
    acronym: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    eissn: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    issn: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    isbn: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    location: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    publisher: {
      type: Sequelize.STRING(200),
      allowNull: true,
    },
    scopusId: {
      type: Sequelize.STRING(15),
      field: 'scopus_id',
      allowNull: true,
    },
    website: {
      type: Sequelize.STRING(250),
      allowNull: true,
    },
    year: {
      type: Sequelize.INTEGER,
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
  await queryInterface.dropTable('source');
}
