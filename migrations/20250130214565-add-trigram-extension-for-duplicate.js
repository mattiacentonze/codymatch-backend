export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    'CREATE EXTENSION IF NOT EXISTS pg_trgm;'
  );
}
