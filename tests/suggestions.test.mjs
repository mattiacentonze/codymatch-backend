import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import request from 'supertest';
import app from '#root/app_initial.mjs';
import {
  truncateAllTables,
  setupTestData,
  runQuery,
  loadMockJson,
  login,
  logout,
  verifyDraft,
  suggestPublication,
  getSuggested,
  saveAndVerifyDraft,
} from './utils/testUtils.mjs';
import sequelize from '#root/services/Sequelize.mjs';

let client;
let loginUsername1 = 'testuser1@.it';
let loginUsername2 = 'testuser2@.it';

beforeAll(async () => {
  client = request(app);
});

beforeEach(async () => {
  const transaction = await sequelize.transaction();
  try {
    await truncateAllTables(transaction);
    await setupTestData(transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Suggestions', () => {
  it('should update settings and return suggestions related to Elisa Molinari', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);
    const entityId = 2;

    const settingsRes = await client
      .post(`/api/rest/research-entities/${entityId}/settings`)
      .set('Cookie', cookie)
      .send({ openAlexId: 'a5079805988' });

    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body).toEqual({
      openAlexId: 'a5079805988',
    });

    const dbResult = await runQuery(`
      SELECT settings FROM research_entity WHERE id = ${entityId}
    `);

    expect(dbResult[0][0].settings.openAlexId).toBe('a5079805988');
    const mockAuthorData = loadMockJson('mockAuthorData.json');
    const mockWorksData = loadMockJson('mockWorksData.json');

    global.fetch = vi.fn((url) => {
      if (url.includes('openalex.org/authors/')) {
        return {
          ok: true,
          status: 200,
          json: () => mockAuthorData,
          text: () => JSON.stringify(mockAuthorData),
        };
      }

      if (url.includes('openalex.org/works')) {
        return {
          ok: true,
          status: 200,
          json: () => mockWorksData,
          text: () => JSON.stringify(mockWorksData),
        };
      }
    });

    await client
      .post('/api/rest/adm/scripts/openAlexProfileImport')
      .set('Cookie', cookie)
      .send({ researchEntityId: entityId, openAlexProfileId: 'A5054669417' });

    const dbResultCheck = await runQuery(`
      SELECT * FROM suggested WHERE research_entity_id = ${entityId}
    `);
    expect(dbResultCheck[0].length).toBeGreaterThan(0);

    const { suggestionsResUser: suggestionsRes } = await getSuggested(
      client,
      cookie,
      entityId
    );
    expect(suggestionsRes.status).toBe(200);
    expect(suggestionsRes.body.rows.length).toBe(2);

    const authorNamesByItem = suggestionsRes.body.rows.map((item) =>
      item.authors.map((a) => a.name.toLowerCase())
    );

    const allContainName = authorNamesByItem.every((authorNames) =>
      authorNames.some((name) => name.includes('elisa molinari'))
    );

    expect(allContainName).toBe(true);

    const researchItems = await runQuery(`
      SELECT data FROM research_item WHERE kind = 'external'
    `);

    const dois = researchItems[0].map((item) => item.data.doi);
    expect(dois).toContain('10.1234/quantum.structure');
    expect(dois).toContain('10.1234/nanotech.device');
  });

  it('should allow a user in a group to suggest a publication to their group via API', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);
    const entityUserId = 2;
    const groupId = 1;

    const draftInput = loadMockJson('draftInput.json');
    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const { verifyRes, verifiedEntry, researchItemId } =
      await saveAndVerifyDraft({
        client,
        cookie,
        entityUserId,
        draftInput,
        affiliation,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    const { res } = await suggestPublication(
      client,
      cookie,
      groupId,
      researchItemId
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const resLogout = await logout(app, cookie);
    expect(resLogout.status).toBe(200);
    expect(resLogout.body).toEqual({ message: 'Logged out' });

    const { response: response2, cookie: cookie2 } = await login(
      app,
      loginUsername2
    );
    expect(response2.status).toBe(302);

    const { suggestionsResUser: suggestionsResUser2, suggested } =
      await getSuggested(client, cookie2, groupId);
    expect(suggestionsResUser2.status).toBe(200);
    expect(suggestionsResUser2.body.rows.length).toBe(1);
    expect(suggested[0].length).toBe(1);
  });

  it('should not show suggested publication after verification', async () => {
    // Login as user1
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    const entityUserId = 2;
    const groupId = 1;

    // Save and Verify a draft for user1
    const draftInput = loadMockJson('draftInput.json');
    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const { verifyRes, verifiedEntry, researchItemId } =
      await saveAndVerifyDraft({
        client,
        cookie,
        entityUserId,
        draftInput,
        affiliation,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    // Suggest the publication to the group
    const { res } = await suggestPublication(
      client,
      cookie,
      groupId,
      researchItemId
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Logout user1
    const resLogout = await logout(app, cookie);
    expect(resLogout.status).toBe(200);
    expect(resLogout.body).toEqual({ message: 'Logged out' });

    // Login as user2 (who is also in the group and is owner of the group)
    const { response: response2, cookie: cookie2 } = await login(
      app,
      loginUsername2
    );
    expect(response2.status).toBe(302);

    // Confirm that the suggestion exists in DB
    const { suggestionsResUser, suggested } = await getSuggested(
      client,
      cookie2,
      groupId
    );
    expect(suggestionsResUser.status).toBe(200);
    expect(suggestionsResUser.body.rows.length).toBe(1);
    expect(suggested[0].length).toBe(1);

    // Setup author2 info for second user
    const author2 = {
      name: 'Smith Simpson John Victor',
      affiliations: [{ instituteId: 502, name: 'University of Salerno' }],
      researchEntityId: null,
      position: 1,
      isCorrespondingAuthor: false,
      isFirstCoauthor: false,
      isLastCoauthor: false,
      isOralPresentation: true,
    };
    const affiliation2 = {
      instituteId: 502,
      name: 'University of Salerno',
    };
    // Prepare and send verification request for user2's authorship
    const verificationPayload2 = {
      researchItemId,
      authorPosition: author2.position,
      affiliations: [affiliation2],
      isCorrespondingAuthor: author2.isCorrespondingAuthor,
      isOralPresentation: author2.isOralPresentation,
      isFirstCoauthor: author2.isFirstCoauthor,
      isLastCoauthor: author2.isLastCoauthor,
    };

    // Verify the publication for user2
    const { verifyRes: verifyRes2, verifiedEntry: verifiedEntry2 } =
      await verifyDraft(
        client,
        cookie2,
        groupId,
        researchItemId,
        verificationPayload2
      );
    expect(verifyRes2.status).toBe(200);
    expect(verifyRes2.body.success).toBe(true);
    expect(verifiedEntry2[0].length).toBe(1);

    // Check that the verified publication is not still suggested
    const { suggestionsResUser: suggestionsResUser2, suggested: suggested2 } =
      await getSuggested(client, cookie2, groupId);
    expect(suggestionsResUser2.status).toBe(200);
    expect(suggestionsResUser2.body.rows.length).toBe(0);
    expect(suggested2[0].length).toBe(0);
  });

  it('should allow user2 to view a publication verified by user1', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);
    const entityUserId = 2;
    const entityUserId2 = 3;

    const draftInput = loadMockJson('draftInput.json');
    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput,
      affiliation,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    const alias = await runQuery(`
    SELECT * FROM alias WHERE research_entity_id = ${entityUserId}`);
    expect(alias[0].length).toBe(2);

    const resLogout = await logout(app, cookie);
    expect(resLogout.status).toBe(200);
    expect(resLogout.body).toEqual({ message: 'Logged out' });

    const { response: response2, cookie: cookie2 } = await login(
      app,
      loginUsername2
    );
    expect(response2.status).toBe(302);

    const { suggestionsResUser } = await getSuggested(
      client,
      cookie2,
      entityUserId2
    );
    expect(suggestionsResUser.status).toBe(200);
    expect(suggestionsResUser.body.rows.length).toBe(1);
  });

  it('should show a verified publication to user2 after alias is added for the same author', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    const entityUserId = 2;
    const entityUserId2 = 3;

    // Save a draft and verify it as user1
    const draftInput = loadMockJson('draftInput.json');
    draftInput.authors = [
      {
        name: 'Smith Simpson John Victor',
        affiliations: [{ instituteId: 502, name: 'University of Salerno' }],
        researchEntityId: null,
        position: 1,
        isCorrespondingAuthor: false,
        isFirstCoauthor: false,
        isLastCoauthor: false,
        isOralPresentation: true,
      },
    ];
    const affiliation = {
      instituteId: 502,
      name: 'University of Salerno',
    };

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput,
      affiliation,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    const alias = await runQuery(`
      SELECT * FROM alias WHERE research_entity_id = ${entityUserId}`);
    expect(alias[0].length).toBe(2);

    // Logout user1
    const resLogout = await logout(app, cookie);
    expect(resLogout.status).toBe(200);
    expect(resLogout.body).toEqual({ message: 'Logged out' });

    const { response: response2, cookie: cookie2 } = await login(
      app,
      loginUsername2
    );
    expect(response2.status).toBe(302);

    await client
      .post(`/api/rest/research-entities/${entityUserId2}/aliases`)
      .set('Cookie', cookie2)
      .send({
        value: 'Smith Simpson John Victor',
        main: false,
      });

    const { suggestionsResUser } = await getSuggested(
      client,
      cookie2,
      entityUserId2
    );
    expect(suggestionsResUser.status).toBe(200);
    expect(suggestionsResUser.body.rows.length).toBe(1);
  });

  //TODO: Uncomment when the feature is implemented

  // it('should not allow suggesting a draft publication', async () => {
  //   const { cookie } = await login(app, loginUsername1);
  //   const entityUserId = 2;
  //   const groupId = 1;
  //   const draftInput = loadMockJson('draftInput.json');
  //   const { researchItemId } = await saveDraft(
  //     client,
  //     cookie,
  //     entityUserId,
  //     draftInput
  //   );
  //
  //   const { res } = await suggestPublication(
  //     client,
  //     cookie,
  //     groupId,
  //     researchItemId
  //   );
  //   expect(res.status).toBe(400);
  //   expect(res.body.success).toBe(false);
  // });
});
