import Sequelize from 'sequelize';

export async function up({ context: queryInterface }) {
  try {
    await queryInterface.addColumn('research_entity', 'profile', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  } catch (e) {
    console.error('Error during migration up:', e);
  }
}

export async function down({ context: queryInterface }) {
  try {
    await queryInterface.removeColumn('research_entity', 'profile');
  } catch (e) {
    console.error('Error during migration down:', e);
  }
}
