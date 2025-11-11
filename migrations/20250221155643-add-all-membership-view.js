export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
CREATE OR REPLACE VIEW all_membership AS
SELECT DISTINCT ON (parent_research_entity_id, child_research_entity_id, through_research_entity_id) parent_research_entity_id,
                                                                                                     child_research_entity_id,
                                                                                                     through_research_entity_id,
                                                                                                     data,
                                                                                                     level
FROM (WITH RECURSIVE subm(parent_research_entity_id, child_research_entity_id, through_research_entity_id, data, level)
                         AS (SELECT m.parent_research_entity_id,
                                    m.child_research_entity_id,
                                    m.child_research_entity_id,
                                    m.data,
                                    1 AS level
                             FROM membership m
                             UNION
                             SELECT m.parent_research_entity_id,
                                    sg.child_research_entity_id,
                                    m.child_research_entity_id,
                                    m.data,
                                    level + 1 AS level
                             FROM membership m
                                      JOIN subm sg ON m.child_research_entity_id = sg.parent_research_entity_id
                             WHERE level < 10)
      SELECT parent_research_entity_id,
             child_research_entity_id,
             through_research_entity_id,
             data,
             sg.level AS level
      FROM subm sg
      ORDER BY level ASC) am;
    `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('DROP VIEW IF EXISTS all_membership;');
}
