import fs from 'fs';
import path from 'path';
import sequelize from '#root/services/Sequelize.mjs';
import { expect, vi } from 'vitest';
import * as authModule from '#root/services/Authentication.mjs';
import UserAccount from '#root/models/UserAccount.mjs';
import request from 'supertest';
import jwt from 'jsonwebtoken';

export async function login(app, username) {
  const user = await UserAccount.findOne({ where: { username } });
  if (!user) return { error: 'User not found' };

  vi.spyOn(authModule, 'getTokens').mockResolvedValue({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    ok: true,
  });

  vi.spyOn(authModule, 'getPublicKey').mockResolvedValue('mock-public-key');

  vi.spyOn(jwt, 'decode').mockReturnValue({
    header: {
      kid: 'mock-key-id',
    },
    email: username,
    iat: Math.floor(Date.now() / 1000),
    payload: {
      email: username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  vi.spyOn(jwt, 'verify').mockImplementation((_token, _key, _opts, cb) => {
    cb(null, true);
  });

  const client = request(app);
  const res = await client.get('/login');
  const cookie = res.headers['set-cookie'];

  if (!cookie) throw new Error('Login failed: no cookie set');

  return { client, user, cookie, response: res };
}

export const logout = async (app, cookie) => {
  global.fetch = vi.fn((...args) => {
    const url = args[0];

    if (
      typeof url === 'string' &&
      url.includes('/.well-known/openid-configuration')
    ) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () =>
          Promise.resolve({
            token_endpoint: 'https://mocked/token',
            logout_endpoint: 'https://mocked/logout',
          }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              token_endpoint: 'https://mocked/token',
              logout_endpoint: 'https://mocked/logout',
            })
          ),
      });
    }

    if (typeof url === 'string' && url.includes('/logout')) {
      return Promise.resolve({
        ok: true,
        status: 204,
        headers: { get: () => null },
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({}),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
    });
  });

  return await request(app).get('/logout').set('Cookie', cookie);
};

export function loadMockJson(filename) {
  const filepath = path.resolve('tests/json_files', filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export function mockFetch(status = 200, data = {}, url = '') {
  global.fetch = vi.fn(async (...args) => {
    const requestedUrl = args[0];
    if (url && requestedUrl !== url) {
      return {
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Not found' }),
      };
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(data),
    };
  });
}

export async function truncateAllTables(transaction) {
  const blacklistTables = [
    'role',
    'permission',
    'role_permission',
    'source_type',
    'research_item_type',
    'sequelize_meta',
  ];
  const tables = await sequelize.getQueryInterface().showAllTables();
  const filteredTables = tables.filter((t) => !blacklistTables.includes(t));
  const tablesList = filteredTables.map((t) => `"${t}"`).join(', ');
  if (tablesList.length) {
    await sequelize.query(
      `TRUNCATE TABLE ${tablesList} RESTART IDENTITY CASCADE;`,
      { transaction }
    );
  }
}

export async function runQuery(query, transaction) {
  return await sequelize.query(query, { transaction });
}

export async function setupTestData(transaction) {
  await runQuery(
    `
      INSERT INTO institute (id, name)
      VALUES
        (714, 'Italian Institute of Technology'),
        (502, 'University of Salerno'),
        (3621, 'Italian Association for Cancer Research'),
        (508, 'University of Palermo'),
        (509, 'University of Verona')
    `,
    transaction
  );

  await runQuery(
    `
      INSERT INTO user_account (id, username, active)
      VALUES
        (1, 'testuser1@.it', true),
        (2, 'testuser2@.it', true),
        (3, 'testuser3@.it', true)
    `,
    transaction
  );

  await runQuery(
    `
      INSERT INTO research_entity (id, type, code, data)
      VALUES
        (1, 'group', 'testgroup1', '{"code":"testgroup1","name":"Test Group1","type":"ORGANIZATION","isActive":true}'),
        (2, 'person', 'testuser1@.it', '{"name":"Test1","email":"testuser1@.it","surname":"User1"}'),
        (3, 'person', 'testuser2@.it', '{"name":"Test2","email":"testuser2@.it","surname":"User2"}'),
        (4, 'person', 'testuser3@.it', '{"name":"Test3","email":"testuser3@.it","surname":"User3"}'),
        (5, 'group', 'testgroup2', '{"code":"testgroup2","name":"Test Group2","type":"ORGANIZATION","isActive":true}')
    `,
    transaction
  );

  await runQuery(
    `
      INSERT INTO user_account_role (user_account_id, role_id, research_entity_id)
      VALUES
        (1, 3, 2),
        (2, 3, 3),
        (3, 3, 4),
        (2, 2, 1)
    `,
    transaction
  );

  await runQuery(
    `
      INSERT INTO membership (parent_research_entity_id, child_research_entity_id, data)
      VALUES (1, 2, '{"isActive": true, "isSynchronised": false}'),
             (1, 3, '{"isActive": true, "isSynchronised": false}')
    `,
    transaction
  );

  await runQuery(
    `
      INSERT INTO alias (research_entity_id, value, main)
      VALUES (2, 'Elisa Molinari', true),
             (3, 'Doe John', true)
    `,
    transaction
  );
}

export async function saveDraft(client, cookie, entityId, draftInput) {
  mockFetch(200, {}, '');

  const draftRes = await client
    .post(`/api/rest/research-entities/${entityId}/draft`)
    .set('Cookie', cookie)
    .send(draftInput);

  expect(draftRes.status).toBe(200);

  const researchItemId = draftRes.body.researchItem.id;

  const inputAuthorNames = draftInput.authors.map((a) => a.name);
  const responseAuthorNames = draftRes.body.updatedAuthors.map((a) => a.name);

  const foundName = inputAuthorNames.find((name) =>
    responseAuthorNames.includes(name)
  );

  if (!foundName) {
    throw new Error(
      `Author not found in response. Expected one of: ${inputAuthorNames.join(', ')}`
    );
  }

  const author = draftRes.body.updatedAuthors.find((a) => a.name === foundName);

  const dbAuthor = await sequelize.query(
    `
      SELECT id FROM author
      WHERE research_item_id = :researchItemId AND position = :position
      LIMIT 1
    `,
    {
      replacements: { researchItemId, position: author.position },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const authorId = dbAuthor[0]?.id;
  if (!authorId) {
    throw new Error(
      `Author not found in DB at position ${author.position} for research_item_id ${researchItemId}`
    );
  }

  return { researchItemId, author };
}

export async function verifyDraft(
  client,
  cookie,
  entityId,
  researchItemId,
  verificationPayload
) {
  const verifyRes = await client
    .post(`/api/rest/research-entities/${entityId}/verify`)
    .set('Cookie', cookie)
    .send(verificationPayload);

  const verifiedEntry = await runQuery(`
    SELECT * FROM verified
    WHERE research_item_id = ${researchItemId} AND research_entity_id = ${entityId}
  `);

  return { verifyRes, verifiedEntry };
}

export async function suggestPublication(
  client,
  cookie,
  entityId,
  researchItemId
) {
  const res = await client
    .post('/api/rest/research-items/suggestion')
    .set('Cookie', cookie)
    .send({
      suggestions: [
        {
          researchEntityId: entityId,
          researchItemId: researchItemId,
        },
      ],
    });

  return { res };
}

export async function getSuggested(client, cookie, entityId) {
  const suggestionsResUser = await client
    .get(
      `/api/rest/research-entities/${entityId}/suggested?where=%7B%22discarded%22%3A%22false%22%7D`
    )
    .set('Cookie', cookie);
  const suggested = await runQuery(`
    SELECT * FROM suggested WHERE type = 'manual'
  `);

  return { suggestionsResUser, suggested };
}

export async function saveAndVerifyDraft({
  client,
  cookie,
  entityUserId,
  draftInput,
  verificationPayload = null,
  affiliation = null,
}) {
  const draftRes = await client
    .post(`/api/rest/research-entities/${entityUserId}/draft`)
    .set('Cookie', cookie)
    .send(draftInput);

  const researchItemId = draftRes.body.researchItem?.id;
  const author = draftInput.authors?.[0];

  const payload =
    verificationPayload ||
    (author
      ? {
          researchItemId,
          authorPosition: author.position ?? 0,
          affiliations: affiliation ? [affiliation] : author.affiliations || [],
          isCorrespondingAuthor: author.isCorrespondingAuthor ?? false,
          isOralPresentation: author.isOralPresentation ?? false,
          isFirstCoauthor: author.isFirstCoauthor ?? false,
          isLastCoauthor: author.isLastCoauthor ?? false,
        }
      : { researchItemId });

  const { verifyRes, verifiedEntry } = await verifyDraft(
    client,
    cookie,
    entityUserId,
    researchItemId,
    payload
  );

  return {
    verifyRes,
    verifiedEntry,
    researchItemId,
    draftRes,
  };
}
