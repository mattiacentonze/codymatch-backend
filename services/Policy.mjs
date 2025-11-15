import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import BearerToken from '#root/models/BearerToken.mjs';
import * as auth from '#root/services/Authentication.mjs';
import { PERMISSIONS } from '#root/services/Authorization.mjs';
import logger from '#root/services/Logger.mjs';

export async function isLoggedIn(req, res, next) {
  // const t = req.session?.token;
  // const rt = req.session?.refresh_token;
  // if (!t)
  //   return res
  //     .status(401)
  //     .json({ code: 401, message: 'Must be logged in to access this route' });
  // const decodedToken = jwt.decode(t, { complete: true });
  // if (!decodedToken)
  //   return res
  //     .status(401)
  //     .json({ code: 401, message: 'Must be logged in to access this route' });
  // if (Date.now() >= decodedToken.payload.exp * 1000) {
  //   const response = await auth.getTokens({ token: rt }, true);
  //   if (!response?.ok)
  //     return res
  //       .status(401)
  //       .json({ code: 401, message: 'Must be logged in to access this route' });
  //   req.session.token = response.access_token;
  //   req.session.refresh_token = response.refresh_token;
  // }
  // const kid = decodedToken.header.kid;
  // const publicKey = await auth.getPublicKey(kid);
  // jwt.verify(req.session.token, publicKey, {}, (err) => {
  //   if (err)
  //     return res
  //       .status(401)
  //       .json({ code: 401, message: 'Must be logged in to access this route' });
  //   next();
  // });
}

function _normalizeEntityIds(body, params) {
  if (params.researchEntityId) return [+params.researchEntityId];
  if (Array.isArray(body.researchEntitiesIds))
    return body.researchEntitiesIds.map((rid) => +rid);
  if (body.researchEntityId) return [+body.researchEntityId];
  return [];
}

function permissionChainKeys(permissionKey) {
  const keys = [];
  let node = PERMISSIONS[permissionKey];
  while (node) {
    keys.push(node.key);
    node = node.parent ? PERMISSIONS[node.parent] : null;
  }
  return keys; // es: ['settings_read', 'research_entity_read', 'all_read']
}

function _hasPermissionForAllEntities(
  userPermissions,
  permissionKey,
  entityIds = []
) {
  const allowedKeys = permissionChainKeys(permissionKey);

  if (!entityIds.length)
    return userPermissions.some(
      (p) => allowedKeys.includes(p.key) && !p.needsResearchEntity
    );

  return entityIds.every((entityId) =>
    userPermissions.some(
      (p) =>
        allowedKeys.includes(p.key) &&
        (!p.needsResearchEntity || p.researchEntityId === entityId)
    )
  );
}

export function hasPermission(permissionKey) {
  return (req, res, next) => {
    // const { permissions = [] } = req.session ?? {};
    // const body = req.body ?? {};
    // const params = req.params ?? {};

    // const entityIds = normalizeEntityIds(body, params);
    // const permMeta = PERMISSIONS[permissionKey];
    // if (!permMeta) {
    //   return res.status(500).json({
    //     code: 500,
    //     message: `Permission "${permissionKey}" not configured`,
    //     success: false,
    //   });
    // }

    // if (permMeta.needsResearchEntity && _.isEmpty(entityIds)) {
    //   return res.status(400).json({
    //     code: 400,
    //     message: `Missing research entities in request`,
    //     success: false,
    //   });
    // }

    // const ok = hasPermissionForAllEntities(
    //   permissions,
    //   permissionKey,
    //   entityIds
    // );

    // if (!ok) {
    //   return res.status(403).json({
    //     code: 403,
    //     message: `Must have permission ${permissionKey} to access this route`,
    //     success: false,
    //   });
    // }
    next();
  };
}

export async function isUser(req, res, next) {
  if (!req.session.user)
    return res
      .status(403)
      .json({ code: 403, message: 'Must be a user to access this route' });
  next();
}

export function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin')
    return res
      .status(403)
      .json({ code: 403, message: 'Must be an admin to access this route' });

  next();
}

export async function hasToken(req, res, next) {
  // const accessToken = req.get('Authorization');
  // if (!accessToken || !accessToken.toLocaleLowerCase().startsWith('bearer '))
  //   return res
  //     .status(403)
  //     .json({ code: 403, message: 'Bearer token not found' });
  // const tokenValue = accessToken.split(' ')[1];
  // try {
  //   const tokenRecords = await BearerToken.findAll({
  //     where: { active: true },
  //   });
  //   for (const tokenRecord of tokenRecords) {
  //     const isMatch = await bcrypt.compare(tokenValue, tokenRecord.token);
  //     if (isMatch) {
  //       const timestamp = new Date().toISOString();
  //       logger.info(
  //         `${timestamp}: API call made by token: ${tokenRecord.name}`
  //       );
  //       next();
  //       return;
  //     }
  //   }
  //   return res.status(403).json({ code: 403, message: 'Invalid token' });
  // } catch (error) {
  //   return res.status(500).json({ code: 500, message: 'Server error' });
  // }
}
