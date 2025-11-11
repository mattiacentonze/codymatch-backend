export async function up({ context: queryInterface }) {
  await queryInterface.addConstraint('author', {
    fields: ['research_item_id', 'position'],
    type: 'unique',
    name: 'author_unique_research_item_position',
  });
  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX source_origin_open_alex_unique 
    ON source ((origin_ids ->> 'open_alex_id'));
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'author',
    'author_unique_research_item_position'
  );
  await queryInterface.sequelize.query(`
    DROP INDEX source_origin_open_alex_unique;
  `);
}
