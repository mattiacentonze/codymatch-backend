import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    const table = await queryInterface.describeTable('permission');
    if (!table.parent) {
      await queryInterface.addColumn('permission', 'parent', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'permission',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'parent',
      });

      await queryInterface.addColumn('permission', 'created_at_aux', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addColumn('permission', 'updated_at_aux', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await queryInterface.sequelize.query(`
        UPDATE permission
        SET created_at_aux = created_at,
            updated_at_aux = updated_at;
      `);

      await queryInterface.removeColumn('permission', 'created_at');
      await queryInterface.removeColumn('permission', 'updated_at');

      await queryInterface.renameColumn(
        'permission',
        'created_at_aux',
        'created_at'
      );
      await queryInterface.renameColumn(
        'permission',
        'updated_at_aux',
        'updated_at'
      );
      await queryInterface.addIndex('permission', ['parent'], {
        name: 'permission_parent_idx',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE permission
      SET parent = CASE key
                     WHEN 'research_entity_read' THEN 1
                     WHEN 'research_entity_write' THEN 2
                     WHEN 'item_read' THEN 4
                     WHEN 'settings_read' THEN 4
                     WHEN 'item_write' THEN 3
                     WHEN 'settings_write' THEN 3
        END
      WHERE key IN (
                    'all_read',
                    'all_write',
                    'research_entity_read',
                    'research_entity_write',
                    'item_read',
                    'settings_read',
                    'item_write',
                    'settings_write'
        );
    `);
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.removeIndex('permission', 'permission_parent_idx');

    const tableDescription = await queryInterface.describeTable('permission');
    if (tableDescription.parent) {
      await queryInterface.removeColumn('permission', 'parent');
    }
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
