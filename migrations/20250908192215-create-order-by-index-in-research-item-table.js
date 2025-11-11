export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    CREATE INDEX CONCURRENTLY idx_research_item_order_json_text
      ON public.research_item
        USING btree (
                     (data #>> '{year}') DESC,
                     (data #>> '{title}') ASC
          )
      WHERE kind IN ('verified', 'external');
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    DROP INDEX CONCURRENTLY IF EXISTS idx_research_item_order_json_text;
  `);
}
