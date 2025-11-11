import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('duplicate_search_optimization', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'research_item_id',
      references: {
        model: 'research_item',
        key: 'id',
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
    },
    doi: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authorsString: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'authors_string',
    },
    authorsStringLength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'authors_string_length',
    },
    titleString: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'title_string',
    },
    titleStringLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'title_string_length',
    },
  });

  await queryInterface.sequelize.query(`
      INSERT INTO duplicate_search_optimization (research_item_id,
                                                 doi,
                                                 authors_string,
                                                 authors_string_length,
                                                 title_string,
                                                 title_string_length)
      SELECT ri.id,
             ri.data ->> 'doi'                                                            AS doi,
             COALESCE(lower(string_agg(a.name, '' ORDER BY a.position)), '')              AS authors_string,
             COALESCE(length(lower(string_agg(a.name, '' ORDER BY a.position))),
                      0)                                                                  AS authors_string_length,
             lower(regexp_replace(COALESCE(ri.data ->> 'title', ''), '<[^>]*>', '', 'g')) AS title_string,
             length(lower(regexp_replace(COALESCE(ri.data ->> 'title', ''), '<[^>]*>', '',
                                         'g')))                                           AS title_string_length
      FROM research_item ri
               LEFT JOIN author a ON a.research_item_id = ri.id
      GROUP BY ri.id, ri.data;
  `);

  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION update_dup_opt_from_research_item()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO duplicate_search_optimization (
          research_item_id,
          doi,
          title_string,
          title_string_length
        )
        VALUES (
          NEW.id,
          NEW.data ->> 'doi',
          lower(regexp_replace(COALESCE(NEW.data ->> 'title', ''), '<[^>]*>', '', 'g')),
          length(lower(regexp_replace(COALESCE(NEW.data ->> 'title', ''), '<[^>]*>', '', 'g')))
        );
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        UPDATE duplicate_search_optimization
        SET doi = NEW.data ->> 'doi', 
            title_string = lower(regexp_replace(COALESCE(NEW.data ->> 'title', ''), '<[^>]*>', '', 'g')),
            title_string_length = length(lower(regexp_replace(COALESCE(NEW.data ->> 'title', ''), '<[^>]*>', '', 'g')))
        WHERE research_item_id = NEW.id;
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await queryInterface.sequelize.query(`
    CREATE TRIGGER trg_dup_opt_research_item
    AFTER INSERT OR UPDATE ON research_item
    FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_research_item();
  `);

  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION update_dup_opt_from_author()
    RETURNS TRIGGER AS $$
    DECLARE
      v_authors TEXT;
      v_authors_length INT;
    BEGIN
      SELECT lower(string_agg(a.name, '' ORDER BY a.position)),
             length(lower(string_agg(a.name, '' ORDER BY a.position)))
      INTO v_authors, v_authors_length
      FROM author a
      WHERE a.research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);
      
      IF FOUND THEN
         UPDATE duplicate_search_optimization
         SET authors_string = v_authors,
             authors_string_length = v_authors_length
         WHERE research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);
      ELSE
         UPDATE duplicate_search_optimization
         SET authors_string = '',
             authors_string_length = 0
         WHERE research_item_id = COALESCE(NEW.research_item_id, OLD.research_item_id);
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await queryInterface.sequelize.query(`
    CREATE TRIGGER trg_dup_opt_author
    AFTER INSERT OR UPDATE OR DELETE ON author
    FOR EACH ROW EXECUTE PROCEDURE update_dup_opt_from_author();
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    `DROP TRIGGER IF EXISTS trg_dup_opt_research_item ON research_item;`
  );
  await queryInterface.sequelize.query(
    `DROP FUNCTION IF EXISTS update_dup_opt_from_research_item();`
  );

  await queryInterface.sequelize.query(
    `DROP TRIGGER IF EXISTS trg_dup_opt_author ON author;`
  );
  await queryInterface.sequelize.query(
    `DROP FUNCTION IF EXISTS update_dup_opt_from_author();`
  );

  await queryInterface.dropTable('duplicate_search_optimization');
}
