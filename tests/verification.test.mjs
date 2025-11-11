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

import {
  truncateAllTables,
  runQuery,
  loadMockJson,
  setupTestData,
  login,
  verifyDraft,
  saveAndVerifyDraft,
  mockFetch,
} from './utils/testUtils.mjs';

import sequelize from '#root/services/Sequelize.mjs';
import app from '#root/app_initial.mjs';

let client;
let username = 'testuser1@.it';

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
describe('Create a Draft and Verify it', () => {
  it('should save a draft and verify an author', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);
    const entityUserId = 2;

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
  });

  it("should not verify if author's affiliations are missing", async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);

    const entityUserId = 2;
    const draftInput = loadMockJson('draftInput.json');

    draftInput.authors = [];

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput,
    });

    expect(verifyRes.body.success).toBe(false);
    expect(verifiedEntry[0].length).toBe(0);
  });

  it('should not verify if no author is specified', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);

    const entityUserId = 2;
    const draftInput = loadMockJson('draftInput.json');

    draftInput.authors = [];

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput,
    });

    expect(verifyRes.body.success).toBe(false);
    expect(verifiedEntry[0].length).toBe(0);
  });

  it('should not verify an incomplete draft', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);

    const entityUserId = 2;
    const draftInput = loadMockJson('draftInput.json');
    draftInput.authors = [];

    mockFetch(200, {}, '');

    const verificationPayload = {
      authorPosition: 0,
      affiliations: [],
      isCorrespondingAuthor: false,
      isOralPresentation: false,
      isFirstCoauthor: false,
      isLastCoauthor: false,
    };

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput,
      verificationPayload,
    });

    expect(verifyRes.body.success).toBe(false);
    expect(verifiedEntry[0].length).toBe(0);
  });
});

describe('Verify an external publication', () => {
  it('should verify an external publication', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);

    await runQuery(`
      INSERT INTO research_item (
        id, research_item_type_id, creator_research_entity_id, kind, data
      ) VALUES (
        1, 1, 2, 'external',
        '{
          "doi": "10.1016/s0168-1605(01)00734-6",
          "year": "2002",
          "title": "Antimicrobial activity of individual and mixed fractions of dill, cilantro, coriander and eucalyptus essential oils",
          "source": {
            "id": 1,
            "issn": ["0168-1605", "1879-3460"],
            "title": "International Journal of Food Microbiology",
            "originIds": { "open_alex_id": "S132626406" },
            "sourceTypeId": 2
          },
          "sourceType": {
            "id": 2,
            "key": "journal",
            "label": "Journal"
          }
        }'
      )
    `);

    await runQuery(`
      INSERT INTO author (
        id, research_item_id, name, position
      ) VALUES (
        1, 1, 'Pascal Delaquis', 0
      )
    `);

    const affiliation = {
      authorId: 1,
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const verificationPayload = {
      researchItemId: 1,
      authorPosition: 0,
      affiliations: [affiliation],
      isCorrespondingAuthor: true,
      isOralPresentation: false,
      isFirstCoauthor: true,
      isLastCoauthor: true,
    };

    const entityUserId = 2;
    const researchItemId = 1;

    const { verifyRes, verifiedEntry } = await verifyDraft(
      client,
      cookie,
      entityUserId,
      researchItemId,
      verificationPayload
    );
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);
  });

  it('should not verify an external publication if author is missing', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);
    const entityUserId = 2;

    await runQuery(`
      INSERT INTO research_item (
        id, research_item_type_id, creator_research_entity_id, kind, data
      ) VALUES (
        2, 1, 2, 'external',
        '{
          "doi": "10.1016/s0168-1605(01)00734-7",
          "year": "2002",
          "title": "Missing author test",
          "source": {
            "id": 79018,
            "issn": ["0168-1605"],
            "title": "Test Journal",
            "originIds": { "open_alex_id": "S000000001" },
            "sourceTypeId": 2
          },
          "sourceType": {
            "id": 2,
            "key": "journal",
            "label": "Journal"
          }
        }'
      )
    `);

    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const verificationPayload = {
      researchItemId: 2,
      authorPosition: 0,
      affiliations: [affiliation],
      isCorrespondingAuthor: true,
      isOralPresentation: false,
      isFirstCoauthor: true,
      isLastCoauthor: true,
    };

    const { verifyRes } = await verifyDraft(
      client,
      cookie,
      entityUserId,
      0,
      verificationPayload
    );
    expect(verifyRes.status).toBeGreaterThanOrEqual(500);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error).toMatch(
      'VerificationMissingAuthorInPositionError'
    );
  });

  it('should not verify an external publication if source is missing', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);
    const entityUserId = 2;

    await runQuery(`
      INSERT INTO research_item (
        id, research_item_type_id, creator_research_entity_id, kind, data
      ) VALUES (
        2, 1, 2, 'external',
        '{
          "doi": "10.1016/s0168-1605(01)00734-7",
          "year": "2002",
          "title": "Missing source test",
          "sourceType": {
            "id": 2,
            "key": "journal",
            "label": "Journal"
          }
        }'
      )
    `);

    const affiliation = {
      authorId: 1,
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const verificationPayload = {
      researchItemId: 2,
      authorPosition: 0,
      affiliations: [affiliation],
      isCorrespondingAuthor: true,
      isOralPresentation: false,
      isFirstCoauthor: true,
      isLastCoauthor: true,
    };

    const { verifyRes } = await verifyDraft(
      client,
      cookie,
      entityUserId,
      0,
      verificationPayload
    );
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error.name).toMatch('validationError');
  });
});
