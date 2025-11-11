import sequelize from '#root/services/Sequelize.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import Role from '#root/models/Role.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';

(async () => {
  const t = await sequelize.transaction();

  try {
    const userEmail = process.argv[2];

    if (!userEmail) {
      console.error(
        `Please provide an email as an argument: setupadmin.js <email>`
      );
      process.exit(1);
    }

    const user = await UserAccount.findOne({
      where: { username: userEmail },
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }

    const adminRole = await Role.findOne({
      where: { key: 'admin' },
      transaction: t,
    });
    if (!adminRole) {
      await t.rollback();
      console.error('Admin role not found');
      process.exit(1);
    }

    const researchEntity = await ResearchEntity.findOne(
      { where: { code: userEmail, type: 'person' } },
      { transaction: t }
    );

    if (!researchEntity) {
      await t.rollback();
      console.error('Research entity not found');
      process.exit(1);
    }

    await UserAccountRole.findOrCreate({
      where: {
        userAccountId: user.id,
        roleId: adminRole.id,
      },
    });

    await t.commit();
    console.log('Admin setup complete');
    process.exit(0);
  } catch (error) {
    await t.rollback();
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
})();
