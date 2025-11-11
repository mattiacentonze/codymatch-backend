import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('source', 'issn_codes', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('source', 'origin_ids', {
      type: Sequelize.JSONB,
      allowNull: true,
      field: 'origin_ids',
    });

    await queryInterface.sequelize.query(`
      UPDATE source
      SET issn_codes = jsonb_build_array(issn)
      WHERE issn IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE source
      SET origin_ids = jsonb_build_object('scopus_id', scopus_id)
      WHERE scopus_id IS NOT NULL
    `);

    await queryInterface.removeColumn('source', 'acronym');
    await queryInterface.removeColumn('source', 'eissn');
    await queryInterface.removeColumn('source', 'isbn');
    await queryInterface.removeColumn('source', 'location');
    await queryInterface.removeColumn('source', 'publisher');
    await queryInterface.removeColumn('source', 'website');
    await queryInterface.removeColumn('source', 'year');
    await queryInterface.removeColumn('source', 'issn');
    await queryInterface.removeColumn('source', 'scopus_id');
    await queryInterface.renameColumn('source', 'issn_codes', 'issn');

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('source', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('source', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE source
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('source', 'created_at');
    await queryInterface.removeColumn('source', 'updated_at');

    await queryInterface.renameColumn('source', 'created_at_aux', 'created_at');
    await queryInterface.renameColumn('source', 'updated_at_aux', 'updated_at');
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('source', 'acronym', {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'eissn', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'isbn', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'location', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'publisher', {
      type: Sequelize.STRING(200),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'website', {
      type: Sequelize.STRING(250),
      allowNull: true,
    });
    await queryInterface.addColumn('source', 'year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.renameColumn('source', 'issn', 'issn_codes');
    await queryInterface.addColumn('source', 'issn', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn('source', 'scopus_id', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE source
      SET issn = (issn_codes->>0)::text
      WHERE issn_codes IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE source
      SET scopus_id = (origin_ids->>'scopus_id')::text
      WHERE origin_ids IS NOT NULL
    `);

    await queryInterface.removeColumn('source', 'issn_codes');
    await queryInterface.removeColumn('source', 'origin_ids');

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('source', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('source', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE source
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('source', 'created_at');
    await queryInterface.removeColumn('source', 'updated_at');

    await queryInterface.renameColumn('source', 'created_at_aux', 'created_at');
    await queryInterface.renameColumn('source', 'updated_at_aux', 'updated_at');
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
