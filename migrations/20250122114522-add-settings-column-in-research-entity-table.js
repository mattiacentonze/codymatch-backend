import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('research_entity', 'settings', {
      type: Sequelize.JSONB,
      allowNull: true,
      field: 'settings',
    });

    await queryInterface.addColumn('research_entity', 'imported_data_aux', {
      type: Sequelize.JSONB,
      allowNull: true,
      field: 'imported_data',
    });

    await queryInterface.removeColumn('research_entity', 'imported_data');

    await queryInterface.renameColumn(
      'research_entity',
      'imported_data_aux',
      'imported_data'
    );

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('research_entity', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('research_entity', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE research_entity
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('research_entity', 'created_at');
    await queryInterface.removeColumn('research_entity', 'updated_at');

    await queryInterface.renameColumn(
      'research_entity',
      'created_at_aux',
      'created_at'
    );
    await queryInterface.renameColumn(
      'research_entity',
      'updated_at_aux',
      'updated_at'
    );
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.removeColumn('research_entity', 'settings');
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
