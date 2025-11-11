'use strict';

import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  const sequelize = queryInterface.sequelize;

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_insert ON research_item;
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_update ON research_item;
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item ON research_item;
      DROP FUNCTION IF EXISTS update_dup_opt_from_research_item();
      DROP TRIGGER IF EXISTS trg_dup_opt_author ON author;
      DROP TRIGGER IF EXISTS trg_dup_opt_author_update ON author;
      DROP FUNCTION IF EXISTS update_dup_opt_from_author();
    `,
      { transaction }
    );

    await queryInterface.addColumn(
      'duplicate_search_optimization',
      'research_item_type_id',
      { type: DataTypes.INTEGER, allowNull: true },
      { transaction }
    );
    await queryInterface.addColumn(
      'duplicate_search_optimization',
      'year',
      { type: DataTypes.INTEGER, allowNull: true },
      { transaction }
    );
    await queryInterface.addColumn(
      'duplicate_search_optimization',
      'sub_type',
      { type: DataTypes.TEXT, allowNull: true },
      { transaction }
    );

    // Backfill existing rows
    await sequelize.query(
      `
      UPDATE duplicate_search_optimization d
      SET
        research_item_type_id = ri.research_item_type_id,
        year                  = (ri.data->>'year')::integer,
        sub_type              = CASE
                                  WHEN rit.key = 'organized_event' THEN ri.data->'eventType'->>'label'
                                  ELSE NULL
                                END
      FROM research_item ri
      JOIN research_item_type rit ON rit.id = ri.research_item_type_id
      WHERE ri.id = d.research_item_id;
    `,
      { transaction }
    );

    // Enforce constraints
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'research_item_type_id',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'research_item_type', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction }
    );
    await queryInterface.changeColumn(
      'duplicate_search_optimization',
      'year',
      { type: DataTypes.INTEGER, allowNull: false },
      { transaction }
    );

    // Re-create functions and triggers
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION update_dup_opt_from_research_item()
      RETURNS TRIGGER AS $$
      DECLARE
        v_type         TEXT;
        v_title        TEXT;
        v_title_length INT;
        v_sub_type     TEXT;
      BEGIN
        SELECT key INTO v_type FROM research_item_type WHERE id = NEW.research_item_type_id;

        IF v_type = 'editorship' THEN
          v_title        := lower(regexp_replace(COALESCE(NEW.data->'source'->>'title',''), '<[^>]*>','','g'));
        ELSE
          v_title        := lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g'));
        END IF;
        v_title_length := length(v_title);

        IF v_type = 'organized_event' THEN
          v_sub_type := NEW.data->'eventType'->>'label';
        ELSE
          v_sub_type := NULL;
        END IF;

        IF TG_OP = 'INSERT' THEN
          INSERT INTO duplicate_search_optimization (
            research_item_id, doi, title_string, title_string_length,
            research_item_type_id, year, sub_type
          ) VALUES (
            NEW.id,
            NEW.data->>'doi',
            v_title,
            v_title_length,
            NEW.research_item_type_id,
            (NEW.data->>'year')::integer,
            v_sub_type
          );
        ELSE
          UPDATE duplicate_search_optimization
          SET
            doi                   = NEW.data->>'doi',
            title_string          = v_title,
            title_string_length   = v_title_length,
            research_item_type_id = NEW.research_item_type_id,
            year                  = (NEW.data->>'year')::integer,
            sub_type              = v_sub_type
          WHERE research_item_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_insert ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_insert
        AFTER INSERT ON research_item
        FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_research_item();

      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_update ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_update
        AFTER UPDATE ON research_item
        FOR EACH ROW
        WHEN (
          NEW.data->>'doi'    IS DISTINCT FROM OLD.data->>'doi'
          OR NEW.data->>'title' IS DISTINCT FROM OLD.data->>'title'
          OR NEW.data->>'year'  IS DISTINCT FROM OLD.data->>'year'
        )
        EXECUTE PROCEDURE update_dup_opt_from_research_item();

      -- Functions & triggers for author
      CREATE OR REPLACE FUNCTION update_dup_opt_from_author()
      RETURNS TRIGGER AS $$
      DECLARE
        v_authors       TEXT;
        v_authors_length INT;
      BEGIN
        SELECT
          lower(string_agg(a.name, '' ORDER BY a.position)),
          length(lower(string_agg(a.name, '' ORDER BY a.position)))
        INTO v_authors, v_authors_length
        FROM author a
        WHERE a.research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);

        UPDATE duplicate_search_optimization
        SET authors_string        = COALESCE(v_authors, ''),
            authors_string_length = COALESCE(v_authors_length, 0)
        WHERE research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_dup_opt_author ON author;
      CREATE TRIGGER trg_dup_opt_author
        AFTER INSERT OR DELETE ON author
        FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_author();

      DROP TRIGGER IF EXISTS trg_dup_opt_author_update ON author;
      CREATE TRIGGER trg_dup_opt_author_update
        AFTER UPDATE OF name, position ON author
        FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_author();
    `,
      { transaction }
    );
  });
}

export async function down({ context: queryInterface }) {
  const sequelize = queryInterface.sequelize;
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_insert ON research_item;
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_update ON research_item;
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item ON research_item;
      DROP FUNCTION IF EXISTS update_dup_opt_from_research_item();
      DROP TRIGGER IF EXISTS trg_dup_opt_author ON author;
      DROP TRIGGER IF EXISTS trg_dup_opt_author_update ON author;
      DROP FUNCTION IF EXISTS update_dup_opt_from_author();
    `,
      { transaction }
    );

    await queryInterface.removeColumn(
      'duplicate_search_optimization',
      'sub_type',
      { transaction }
    );
    await queryInterface.removeColumn('duplicate_search_optimization', 'year', {
      transaction,
    });
    await queryInterface.removeColumn(
      'duplicate_search_optimization',
      'research_item_type_id',
      { transaction }
    );

    // Re-create original functions and triggers
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION update_dup_opt_from_research_item()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO duplicate_search_optimization (
            research_item_id, doi, title_string, title_string_length
          ) VALUES (
            NEW.id,
            NEW.data->>'doi',
            lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g')),
            length(lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g')))
          );
        ELSE
          UPDATE duplicate_search_optimization
          SET
            doi                 = NEW.data->>'doi',
            title_string        = lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g')),
            title_string_length = length(lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g')))
          WHERE research_item_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_dup_opt_research_item
        AFTER INSERT OR UPDATE ON research_item
        FOR EACH ROW
        EXECUTE PROCEDURE update_dup_opt_from_research_item();

      CREATE OR REPLACE FUNCTION update_dup_opt_from_author()
      RETURNS TRIGGER AS $$
      DECLARE
        v_authors TEXT;
        v_authors_length INT;
      BEGIN
        SELECT
          lower(string_agg(a.name, '' ORDER BY a.position)),
          length(lower(string_agg(a.name, '' ORDER BY a.position)))
        INTO v_authors, v_authors_length
        FROM author a
        WHERE a.research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);

        IF FOUND THEN
          UPDATE duplicate_search_optimization
          SET
            authors_string        = v_authors,
            authors_string_length = v_authors_length
          WHERE research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);
        ELSE
          UPDATE duplicate_search_optimization
          SET
            authors_string        = '',
            authors_string_length = 0
          WHERE research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_dup_opt_author
        AFTER INSERT OR UPDATE OR DELETE ON author
        FOR EACH ROW
        EXECUTE PROCEDURE update_dup_opt_from_author();
    `,
      { transaction }
    );
  });
}
