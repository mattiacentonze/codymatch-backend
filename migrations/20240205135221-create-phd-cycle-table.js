import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('phd_cycle', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    phdCourseId: {
      type: Sequelize.INTEGER,
      field: 'phd_course_id',
      allowNull: false,
      references: {
        model: 'phd_course',
        key: 'id',
      },
      onDelete: 'cascade',
    },
    name: {
      type: Sequelize.STRING(5),
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

  await queryInterface.addIndex('phd_cycle', ['phd_course_id', 'name'], {
    name: 'unique_phd_cycle',
    unique: true,
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('phd_cycle', 'unique_phd_cycle');
  await queryInterface.dropTable('phd_cycle');
}
