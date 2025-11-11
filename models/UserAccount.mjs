import { DataTypes } from 'sequelize';
import _ from 'lodash';
import sequelize from '#root/services/Sequelize.mjs';
import { errorTypes } from '#root/services/Error.mjs';
import getValidator from '#root/services/Validator.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import Role from '#root/models/Role.mjs';
import Permission from '#root/models/Permission.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';
import UserAccountPermission from '#root/models/UserAccountPermission.mjs';

const validate = getValidator('userAccount');

const UserAccount = sequelize.define(
  'UserAccount',
  {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'user_account',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: 'user_account_pkey',
        unique: true,
        fields: [{ name: 'id' }],
      },
    ],
  }
);

UserAccount.initializeRelations = function (models) {
  UserAccount.hasMany(models.Notification, {
    as: 'notifications',
    foreignKey: 'senderId',
  });
  UserAccount.hasMany(models.NotificationRecipient, {
    as: 'notificationRecipients',
    foreignKey: 'recipientId',
  });
  UserAccount.hasMany(models.UserAccountPermission, {
    as: 'userAccountPermissions',
    foreignKey: 'userAccountId',
  });
  UserAccount.hasMany(models.UserAccountRole, {
    as: 'userAccountRoles',
    foreignKey: 'userAccountId',
  });
  UserAccount.belongsTo(models.ResearchEntity, {
    as: 'entity',
    foreignKey: 'username',
    targetKey: 'code',
  });
};

UserAccount.createUserAccount = async function (data, transaction) {
  const userData = _.cloneDeep(data);
  userData.username = data.email;
  if (!validate(userData)) {
    throw {
      name: errorTypes.ValidationError,
      error: validate.errors,
    };
  }

  const user = await this.create(userData, { transaction });

  const researchEntityData = {
    type: 'person',
    code: data.email,
    data: {
      name: data.name,
      surname: data.surname,
      email: data.email,
    },
  };

  const researchEntity = await ResearchEntity.createRE(
    'simplePerson',
    researchEntityData,
    transaction
  );

  const role = await Role.findOne({
    where: { key: 'person_owner' },
    transaction,
  });

  if (role) {
    await UserAccountRole.create(
      {
        userAccountId: user.id,
        roleId: role.id,
        researchEntityId: researchEntity.id,
      },
      { transaction }
    );
  } else {
    console.log('Role not found');
    return {};
  }
  return { user, researchEntity };
};

UserAccount.updateUserAccount = async function (data, transaction) {
  const user = await this.findOne({
    where: { username: data.email },
    transaction,
  });
  if (!user) {
    throw {
      name: errorTypes.NotExistsError,
      errors: [{ message: 'User account does not exist' }],
    };
  }
  const role = await Role.findOne({
    where: { key: 'person_owner' },
    transaction,
  });
  if (!role) {
    throw {
      name: errorTypes.NotExistsError,
      errors: [{ message: 'Role person_owner does not exist' }],
    };
  }

  const userRole = await UserAccountRole.findOne({
    where: {
      userAccountId: user.id,
      roleId: role.id,
    },
    transaction,
  });
  if (!userRole) {
    throw {
      name: errorTypes.NotExistsError,
      errors: [{ message: 'User account does not have the person_owner role' }],
    };
  }
  const researchEntity = {
    id: userRole.researchEntityId,
    type: 'person',
    code: data.email,
    data: {
      name: data.name,
      surname: data.surname,
      email: data.email,
    },
  };

  await ResearchEntity.updateRE('simplePerson', researchEntity, transaction);
  return { user, researchEntity };
};

UserAccount.updateSettings = async function (
  username,
  newSettings,
  transaction
) {
  const user = await this.findOne({
    where: { username },
    transaction,
  });

  if (!user) {
    throw {
      name: errorTypes.NotExistsError,
      errors: [{ message: 'User account does not exist' }],
    };
  }

  user.settings = _.merge({}, user.settings || {}, newSettings);

  await user.save({ transaction });
  return user;
};

UserAccount.addPermission = async function (
  userAccountId,
  permissionKey,
  researchEntityId,
  transaction,
  type = 'granted'
) {
  const { id: permissionId } = await Permission.findOne({
    where: { key: permissionKey },
    transaction,
  });
  const [uap] = await UserAccountPermission.findOrCreate({
    where: {
      userAccountId,
      permissionId,
      researchEntityId,
      type,
    },
    transaction,
  });

  return uap;
};

export default UserAccount;
