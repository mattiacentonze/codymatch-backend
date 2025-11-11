import _ from 'lodash';
import UserAccountPermission from '#root/models/UserAccountPermission.mjs';
import Permission from '#root/models/Permission.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import ResearchEntity from '#root/models/ResearchEntity.mjs';
import UserAccountRole from '#root/models/UserAccountRole.mjs';
import Role from '#root/models/Role.mjs';
import RolePermission from '#root/models/RolePermission.mjs';

export let PERMISSIONS = {};

export async function initPermissions() {
  const permissions = await Permission.findAll({
    attributes: ['id', 'key', 'label', 'parent', 'needsResearchEntity'],
    order: [['id', 'ASC']],
  });

  const map = {};
  for (const p of permissions) {
    const obj = {
      id: p.id,
      key: p.key,
      label: p.label,
      parent: p.parent,
      needsResearchEntity: p.needsResearchEntity,
    };
    map[p.id] = obj;
    map[p.key] = obj;
  }

  PERMISSIONS = map;
  return PERMISSIONS;
}

export async function getPermission(userAccountId, permissionKey, transaction) {
  const p = await Permission.findOne(
    { where: { key: permissionKey } },
    { transaction }
  );
  return await UserAccountPermission.findOne(
    {
      where: {
        userAccountId,
        permissionId: p.id,
      },
    },
    { transaction }
  );
}

export async function getUserPermissions(userAccountId, transaction) {
  const userAccountData = await UserAccount.findOne(
    {
      where: { id: userAccountId },
      include: [
        {
          model: UserAccountPermission,
          as: 'userAccountPermissions',
          include: [
            {
              model: Permission,
              as: 'permission',
            },
            {
              model: ResearchEntity,
              as: 'researchEntity',
            },
          ],
        },
        {
          model: UserAccountRole,
          as: 'userAccountRoles',
          include: [
            {
              model: Role,
              as: 'role',
              include: [
                {
                  model: RolePermission,
                  as: 'rolePermissions',
                  include: [
                    {
                      model: Permission,
                      as: 'permission',
                    },
                  ],
                },
              ],
            },
            {
              model: ResearchEntity,
              as: 'researchEntity',
            },
          ],
        },
      ],
    },
    { ...(transaction && { transaction }) }
  );

  // permissions

  const permissions = _.uniqWith(
    userAccountData.userAccountRoles.reduce((acc, userAccountRole) => {
      acc.push(
        ...userAccountRole.role.rolePermissions.map((perm) => ({
          id: perm.permission.id,
          key: perm.permission.key,
          label: perm.permission.label,
          needsResearchEntity: userAccountRole.role.needsResearchEntity,
          ...(userAccountRole.role.needsResearchEntity && {
            researchEntityId: userAccountRole.researchEntityId || null,
          }),
        }))
      );
      return acc;
    }, []),
    comparePermissions
  );

  const permissionsOverwrite = userAccountData.userAccountPermissions.map(
    (perm) => ({
      id: perm.permission.id,
      key: perm.permission.key,
      label: perm.permission.label,
      needsResearchEntity: perm.permission.needsResearchEntity,
      type: perm.type,
      ...(perm.permission.needsResearchEntity && {
        researchEntityId: perm.researchEntity?.id || null,
      }),
    })
  );

  const filteredPermissions = permissions.filter(
    (p) =>
      !permissionsOverwrite.some(
        (p2) => p2.type === 'denied' && comparePermissions(p, p2)
      )
  );

  filteredPermissions.push(
    ...permissionsOverwrite.filter(
      (p) =>
        p.type === 'granted' &&
        !permissions.some((p2) => comparePermissions(p, p2))
    )
  );
  filteredPermissions.forEach((p) => delete p.type);

  const permissionResearchEntities = filteredPermissions
    .filter((p) => p.needsResearchEntity)
    .map((p) => p.researchEntityId);

  // research entities

  const roleResearchEntities = userAccountData.userAccountRoles.map(
    (role) => role.researchEntityId
  );
  const researchEntityIds = await ResearchEntity.findAll({
    where: { id: [...permissionResearchEntities, ...roleResearchEntities] },
  });

  const researchEntities = researchEntityIds.map((re) => ({
    id: re.id,
    type: re.type,
    code: re.code,
    data: re.data,
  }));

  // roles

  const roles = userAccountData.userAccountRoles.map((role) => ({
    id: role.role.id,
    key: role.role.key,
    label: role.role.label,
    researchEntityId: role.researchEntityId,
  }));

  const myReId = roles.find(
    (role) => role.key === 'person_owner'
  )?.researchEntityId;

  let myRe = { data: { name: '', surname: '' } };
  if (myReId)
    myRe = await ResearchEntity.findOne({
      where: { id: myReId },
    });

  return {
    user: {
      id: userAccountData.id,
      username: userAccountData.username,
      name: myRe.data.name,
      surname: myRe.data.surname,
    },
    permissions: filteredPermissions,
    roles,
  };
}

function comparePermissions(a, b) {
  return (
    a.key === b.key &&
    (a.researchEntityId === b.researchEntityId ||
      (!a.researchEntityId && !b.researchEntityId))
  );
}

/*export async function updatePermissionsSession(req, id) {
  const { user, permissions, researchEntities, roles } =
    await getUserPermissions(id);
  req.session.user = user;
  req.session.permissions = permissions;
  req.session.researchEntities = researchEntities;
  req.session.roles = roles;
}*/
