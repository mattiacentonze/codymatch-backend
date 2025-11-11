export async function up({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'user_account_role',
    'unique_user_account_role'
  );
  await queryInterface.addIndex(
    'user_account_role',
    ['user_account_id', 'role_id', 'research_entity_id'],
    {
      unique: true,
      name: 'unique_user_account_role',
    }
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex(
    'user_account_role',
    'unique_user_account_role'
  );
  await queryInterface.addIndex(
    'user_account_role',
    ['user_account_id', 'role_id'],
    {
      unique: true,
      name: 'unique_user_account_role',
    }
  );
}
