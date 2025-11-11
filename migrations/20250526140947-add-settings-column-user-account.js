import { Sequelize } from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('user_account', 'settings', {
      type: Sequelize.JSONB,
      allowNull: true,
      field: 'settings',
    });

    // moving created_at and updated_at to the end of the table
    await queryInterface.addColumn('user_account', 'created_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('user_account', 'updated_at_aux', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE user_account
      SET created_at_aux = created_at,
          updated_at_aux = updated_at;
    `);

    await queryInterface.removeColumn('user_account', 'created_at');
    await queryInterface.removeColumn('user_account', 'updated_at');

    await queryInterface.renameColumn(
      'user_account',
      'created_at_aux',
      'created_at'
    );
    await queryInterface.renameColumn(
      'user_account',
      'updated_at_aux',
      'updated_at'
    );
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.removeColumn('user_account', 'settings');
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
