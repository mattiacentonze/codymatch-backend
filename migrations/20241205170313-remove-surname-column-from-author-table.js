import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.sequelize.query(`
      UPDATE author
      SET name = CONCAT(name, ' ', surname)
      WHERE surname IS NOT NULL
    `);

    await queryInterface.removeColumn('author', 'surname');

    await queryInterface.changeColumn('author', 'name', {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('author', 'surname', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE author
      SET surname = TRIM(SPLIT_PART(name, ' ', 2)),
          name = TRIM(SPLIT_PART(name, ' ', 1))
      WHERE name LIKE '% %'
    `);

    await queryInterface.changeColumn('author', 'name', {
      type: Sequelize.STRING(50),
      allowNull: false,
    });
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
