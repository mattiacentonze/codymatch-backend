export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(`
    WITH duplicates AS (
      SELECT ctid,
             ROW_NUMBER() OVER (PARTITION BY author_id, institute_id ORDER BY ctid) AS rn
      FROM affiliation
    )
    DELETE FROM affiliation a
    USING duplicates d
    WHERE a.ctid = d.ctid
      AND d.rn > 1;
  `);

  await queryInterface.addConstraint('affiliation', {
    fields: ['author_id', 'institute_id'],
    type: 'unique',
    name: 'affiliation_unique_author_institute',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeConstraint(
    'affiliation',
    'affiliation_unique_author_institute'
  );
}
