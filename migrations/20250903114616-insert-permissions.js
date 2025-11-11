export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    INSERT INTO permission (id, key, label, needs_research_entity, parent, created_at, updated_at)
    SELECT *
    FROM (VALUES
            (5, 'item_read', 'Item read', true, 4, NOW(), NOW()),
            (6, 'settings_read', 'Settings read', true, 4, NOW(), NOW()),
            (7, 'item_write', 'Item write', true, 3, NOW(), NOW()),
            (8, 'settings_write', 'Settings write', true, 3, NOW(), NOW())
         ) AS vals(id, key, label, needs_research_entity, parent, created_at, updated_at)
    WHERE (
            SELECT COUNT(*) FROM permission WHERE id BETWEEN 1 AND 4
          ) = 4
    ON CONFLICT DO NOTHING;
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    DELETE FROM permission
    WHERE key IN (
                  'item_read',
                  'settings_read',
                  'item_write',
                  'settings_write'
      );
  `);
}
