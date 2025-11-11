'use strict';

export async function up({ context: queryInterface }) {
  const sequelize = queryInterface.sequelize;

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `
      UPDATE research_item
      SET data = jsonb_set(
        data,
        '{eventType}',
        COALESCE( to_jsonb(data->'eventType'->>'label'), 'null'::jsonb ),
        false
      )
      WHERE jsonb_typeof(data->'eventType') = 'object';
      `,
      { transaction }
    );

    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION update_dup_opt_from_research_item()
      RETURNS TRIGGER AS $$
      DECLARE
        v_type                 TEXT;
        v_title                TEXT;
        v_title_length         INT;
        v_sub_type             TEXT;
        v_event                TEXT;
        v_event_length         INT;
        v_application_number   TEXT;
        v_filing_date          TEXT;
        v_patent_number        TEXT;
        v_issue_date           TEXT;
      BEGIN
        SELECT key INTO v_type FROM research_item_type WHERE id = NEW.research_item_type_id;

        IF v_type = 'editorship' THEN
          v_title := lower(regexp_replace(COALESCE(NEW.data->'source'->>'title',''), '<[^>]*>','','g'));
        ELSE
          v_title := lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g'));
        END IF;
        v_title_length := length(v_title);

        v_sub_type := NEW.data->>'eventType';

        v_event               := lower(regexp_replace(COALESCE(NEW.data->>'event',''), '<[^>]*>','','g'));
        v_event_length        := length(v_event);
        v_application_number  := NEW.data->>'applicationNumber';
        v_filing_date         := NEW.data->>'filingDate';
        v_patent_number       := NEW.data->>'patentNumber';
        v_issue_date          := NEW.data->>'issueDate';

        IF TG_OP = 'INSERT' THEN
          INSERT INTO duplicate_search_optimization (
            research_item_id,
            doi,
            title_string,
            title_string_length,
            research_item_type_id,
            year,
            sub_type,
            event_string,
            event_string_length,
            application_number,
            filing_date,
            patent_number,
            issue_date
          ) VALUES (
            NEW.id,
            NEW.data->>'doi',
            v_title,
            v_title_length,
            NEW.research_item_type_id,
            (NEW.data->>'year')::integer,
            v_sub_type,
            v_event,
            v_event_length,
            v_application_number,
            v_filing_date,
            v_patent_number,
            v_issue_date
          );
        ELSE
          UPDATE duplicate_search_optimization
          SET
            doi                   = NEW.data->>'doi',
            title_string          = v_title,
            title_string_length   = v_title_length,
            research_item_type_id = NEW.research_item_type_id,
            year                  = (NEW.data->>'year')::integer,
            sub_type              = v_sub_type,
            event_string          = v_event,
            event_string_length   = v_event_length,
            application_number    = v_application_number,
            filing_date           = v_filing_date,
            patent_number         = v_patent_number,
            issue_date            = v_issue_date
          WHERE research_item_id = NEW.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      `,
      { transaction }
    );

    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_update ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_update
        AFTER UPDATE ON research_item
        FOR EACH ROW
        WHEN (
          NEW.data->>'doi'             IS DISTINCT FROM OLD.data->>'doi'
          OR NEW.data->>'title'        IS DISTINCT FROM OLD.data->>'title'
          OR NEW.data->>'year'         IS DISTINCT FROM OLD.data->>'year'
          OR NEW.data->>'eventType'    IS DISTINCT FROM OLD.data->>'eventType'
          OR NEW.data->>'event'        IS DISTINCT FROM OLD.data->>'event'
          OR NEW.data->>'applicationNumber'  IS DISTINCT FROM OLD.data->>'applicationNumber'
          OR NEW.data->>'filingDate'         IS DISTINCT FROM OLD.data->>'filingDate'
          OR NEW.data->>'patentNumber'       IS DISTINCT FROM OLD.data->>'patentNumber'
          OR NEW.data->>'issueDate'          IS DISTINCT FROM OLD.data->>'issueDate'
          OR NEW.research_item_type_id IS DISTINCT FROM OLD.research_item_type_id
        )
        EXECUTE PROCEDURE update_dup_opt_from_research_item();
      `,
      { transaction }
    );

    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_insert ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_insert
        AFTER INSERT ON research_item
        FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_research_item();
      `,
      { transaction }
    );

    await sequelize.query(
      `
      UPDATE duplicate_search_optimization d
      SET
        sub_type             = ri.data->>'eventType',
        event_string         = lower(regexp_replace(COALESCE(ri.data->>'event',''), '<[^>]*>','','g')),
        event_string_length  = length(lower(regexp_replace(COALESCE(ri.data->>'event',''), '<[^>]*>','','g'))),
        application_number   = ri.data->>'applicationNumber',
        filing_date          = ri.data->>'filingDate',
        patent_number        = ri.data->>'patentNumber',
        issue_date           = ri.data->>'issueDate'
      FROM research_item ri
      WHERE ri.id = d.research_item_id;
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
      CREATE OR REPLACE FUNCTION update_dup_opt_from_research_item()
      RETURNS TRIGGER AS $$
      DECLARE
        v_type               TEXT;
        v_title              TEXT;
        v_title_length       INT;
        v_sub_type           TEXT;
        v_event              TEXT;
        v_event_length       INT;
        v_application_number TEXT;
        v_filing_date        TEXT;
        v_patent_number      TEXT;
        v_issue_date         TEXT;
      BEGIN
        SELECT key INTO v_type FROM research_item_type WHERE id = NEW.research_item_type_id;

        IF v_type = 'editorship' THEN
          v_title := lower(regexp_replace(COALESCE(NEW.data->'source'->>'title',''), '<[^>]*>','','g'));
        ELSE
          v_title := lower(regexp_replace(COALESCE(NEW.data->>'title',''), '<[^>]*>','','g'));
        END IF;
        v_title_length := length(v_title);

        v_sub_type := NEW.data->'eventType'->>'label';

        v_event               := lower(regexp_replace(COALESCE(NEW.data->>'event',''), '<[^>]*>','','g'));
        v_event_length        := length(v_event);
        v_application_number  := NEW.data->>'applicationNumber';
        v_filing_date         := NEW.data->>'filingDate';
        v_patent_number       := NEW.data->>'patentNumber';
        v_issue_date          := NEW.data->>'issueDate';

        IF TG_OP = 'INSERT' THEN
          INSERT INTO duplicate_search_optimization (
            research_item_id,
            doi,
            title_string,
            title_string_length,
            research_item_type_id,
            year,
            sub_type,
            event_string,
            event_string_length,
            application_number,
            filing_date,
            patent_number,
            issue_date
          ) VALUES (
            NEW.id,
            NEW.data->>'doi',
            v_title,
            v_title_length,
            NEW.research_item_type_id,
            (NEW.data->>'year')::integer,
            v_sub_type,
            v_event,
            v_event_length,
            v_application_number,
            v_filing_date,
            v_patent_number,
            v_issue_date
          );
        ELSE
          UPDATE duplicate_search_optimization
          SET
            doi                   = NEW.data->>'doi',
            title_string          = v_title,
            title_string_length   = v_title_length,
            research_item_type_id = NEW.research_item_type_id,
            year                  = (NEW.data->>'year')::integer,
            sub_type              = v_sub_type,
            event_string          = v_event,
            event_string_length   = v_event_length,
            application_number    = v_application_number,
            filing_date           = v_filing_date,
            patent_number         = v_patent_number,
            issue_date            = v_issue_date
          WHERE research_item_id = NEW.id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      `,
      { transaction }
    );

    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_update ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_update
        AFTER UPDATE ON research_item
        FOR EACH ROW
        WHEN (
          NEW.data->>'doi'                   IS DISTINCT FROM OLD.data->>'doi'
          OR NEW.data->>'title'              IS DISTINCT FROM OLD.data->>'title'
          OR NEW.data->>'year'               IS DISTINCT FROM OLD.data->>'year'
          OR NEW.data->'eventType'->>'label' IS DISTINCT FROM OLD.data->'eventType'->>'label'
          OR NEW.data->>'event'              IS DISTINCT FROM OLD.data->>'event'
          OR NEW.data->>'applicationNumber'  IS DISTINCT FROM OLD.data->>'applicationNumber'
          OR NEW.data->>'filingDate'         IS DISTINCT FROM OLD.data->>'filingDate'
          OR NEW.data->>'patentNumber'       IS DISTINCT FROM OLD.data->>'patentNumber'
          OR NEW.data->>'issueDate'          IS DISTINCT FROM OLD.data->>'issueDate'
          OR NEW.research_item_type_id       IS DISTINCT FROM OLD.research_item_type_id
        )
        EXECUTE PROCEDURE update_dup_opt_from_research_item();
      `,
      { transaction }
    );

    await sequelize.query(
      `
      DROP TRIGGER IF EXISTS trg_dup_opt_research_item_insert ON research_item;
      CREATE TRIGGER trg_dup_opt_research_item_insert
        AFTER INSERT ON research_item
        FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_research_item();
      `,
      { transaction }
    );

    await sequelize.query(
      `
      UPDATE duplicate_search_optimization d
      SET
        sub_type = ri.data->'eventType'->>'label',
        event_string = ri.data->>'event',
        event_string_length = CASE WHEN ri.data ? 'event'
          THEN length(lower(regexp_replace(COALESCE(ri.data->>'event',''), '<[^>]*>','','g')))
          ELSE event_string_length END
      FROM research_item ri
      WHERE ri.id = d.research_item_id;
      `,
      { transaction }
    );
  });
}
