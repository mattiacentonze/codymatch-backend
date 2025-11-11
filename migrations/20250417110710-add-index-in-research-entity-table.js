export async function up({ context: queryInterface }) {
  await queryInterface.addIndex('research_entity', ['type'], {
    name: 'research_entity_type_index',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'research_entity',
    'research_entity_type_index'
  );
}
