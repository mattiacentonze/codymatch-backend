import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('origin_identifier', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(15),
      allowNull: false,
    },
    identifier: {
      type: Sequelize.STRING(300),
      allowNull: false,
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

  await queryInterface.addIndex('origin_identifier', ['name', 'identifier'], {
    name: 'unique_origin_identifier',
    unique: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'origin_identifier',
    'unique_origin_identifier'
  );
  await queryInterface.dropTable('origin_identifier');
}
