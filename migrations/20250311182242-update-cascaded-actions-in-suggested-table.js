export async function up({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'suggested',
    'suggested_research_item_id_fkey'
  );

  await queryInterface.addConstraint('suggested', {
    fields: ['research_item_id'],
    type: 'foreign key',
    name: 'suggested_research_item_id_fkey',
    references: {
      table: 'research_item',
      field: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  await queryInterface.removeConstraint(
    'suggested',
    'suggested_research_entity_id_fkey'
  );

  await queryInterface.addConstraint('suggested', {
    fields: ['research_entity_id'],
    type: 'foreign key',
    name: 'suggested_research_entity_id_fkey',
    references: {
      table: 'research_entity',
      field: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'suggested',
    'suggested_research_item_id_fkey'
  );

  await queryInterface.addConstraint('suggested', {
    fields: ['research_item_id'],
    type: 'foreign key',
    name: 'suggested_research_item_id_fkey',
    references: {
      table: 'research_item',
      field: 'id',
    },
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  });

  await queryInterface.removeConstraint(
    'suggested',
    'suggested_research_entity_id_fkey'
  );

  await queryInterface.addConstraint('suggested', {
    fields: ['research_entity_id'],
    type: 'foreign key',
    name: 'suggested_research_entity_id_fkey',
    references: {
      table: 'research_entity',
      field: 'id',
    },
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  });
}
