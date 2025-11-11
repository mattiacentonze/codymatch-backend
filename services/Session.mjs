import { getUserPermissions } from '#root/services/Authorization.mjs';

export async function getUserInfo(req, id, refresh = false, transaction) {
  // check if the user data is not already in the session or if refresh is true
  if (
    refresh ||
    !(
      req.session.user &&
      req.session.permissions &&
      req.session.roles
    )
  ) {
    const { user, permissions, roles } =
      await getUserPermissions(id, transaction);

    req.session.user = user;
    req.session.permissions = permissions;
    req.session.roles = roles;
  }
  return {
    user: req.session.user,
    permissions: req.session.permissions,
    roles: req.session.roles,
  };
}
