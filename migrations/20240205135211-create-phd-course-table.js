import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('phd_course', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    phdInstituteId: {
      type: Sequelize.INTEGER,
      field: 'phd_institute_id',
      allowNull: false,
      references: {
        model: 'phd_institute',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    name: {
      type: Sequelize.STRING(100),
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

  await queryInterface.addIndex('phd_course', ['phd_institute_id', 'name'], {
    name: 'unique_phd_course',
    unique: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('phd_course', 'unique_phd_course');
  await queryInterface.dropTable('phd_course');
}
