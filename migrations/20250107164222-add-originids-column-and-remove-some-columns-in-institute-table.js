import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('institute', 'origin_ids', {
      type: Sequelize.JSONB,
      allowNull: true,
      field: 'origin_ids',
    });

    await queryInterface.sequelize.query(`
        UPDATE institute
        SET origin_ids = jsonb_build_object('scopus_id', scopus_id)
        WHERE scopus_id IS NOT NULL     
    `);
    await queryInterface.removeColumn('institute', 'scopus_id');
    await queryInterface.removeColumn('institute', 'country');
    await queryInterface.removeColumn('institute', 'city');

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('institute', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('institute', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE institute
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('institute', 'created_at');
    await queryInterface.removeColumn('institute', 'updated_at');

    await queryInterface.renameColumn(
      'institute',
      'created_at_aux',
      'created_at'
    );
    await queryInterface.renameColumn(
      'institute',
      'updated_at_aux',
      'updated_at'
    );
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('institute', 'country', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('institute', 'city', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('institute', 'scopus_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE institute
      SET scopus_id = origin_ids ->> 'scopus_id'
      WHERE origin_ids IS NOT NULL;
    `);

    await queryInterface.removeColumn('institute', 'origin_ids');

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('institute', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('institute', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE institute
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('institute', 'created_at');
    await queryInterface.removeColumn('institute', 'updated_at');

    await queryInterface.renameColumn(
      'institute',
      'created_at_aux',
      'created_at'
    );
    await queryInterface.renameColumn(
      'institute',
      'updated_at_aux',
      'updated_at'
    );
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
