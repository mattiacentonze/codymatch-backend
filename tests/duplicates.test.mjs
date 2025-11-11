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
  loadMockJson,
  login,
  saveDraft,
  saveAndVerifyDraft,
} from './utils/testUtils.mjs';
import sequelize from '#root/services/Sequelize.mjs';

let client;
let loginUsername1 = 'testuser1@.it';
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

describe('Duplicates API Tests', () => {
  const entityUserId = 2;

  it('should detect duplicate publications by same DOI', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    // Step 1: Save and verify the first draft
    const draftInput1 = loadMockJson('draftInput.json');
    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: draftInput1,
      affiliation,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    // Step 2: Save a second draft with the same DOI and different authors
    const draftInput2 = loadMockJson('draftInput.json');
    draftInput2.authors = [
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
    const { researchItemId: duplicateId } = await saveDraft(
      client,
      cookie,
      entityUserId,
      draftInput2
    );

    // Step 3: Fetch the second item and assert it has duplicates
    const res = await client
      .get(`/api/rest/research-items/${duplicateId}`)
      .set('Cookie', cookie);

    expect(res.body.data.title).toBe(draftInput2.data.title);
    expect(res.status).toBe(200);
    const { duplicates } = res.body;
    expect(Array.isArray(duplicates)).toBe(true);
    expect(duplicates.length).toBe(1);

    for (const dup of duplicates) {
      const dupItem = dup.researchItem;
      expect(dupItem?.data?.doi).toBe('10.1007/s10404-023-02629-4');
      expect(dupItem?.kind).toBe('verified');

      const authorNames = dupItem.authors.map((a) => a.name);
      expect(authorNames).toContain('Smith Simpson John Victor');
      expect(authorNames).toContain('Doe John');
    }
  });

  it('should detect duplicates when title similarity > 70% regardless of length ratio', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    const baseDraftInput = loadMockJson('draftInput.json');
    baseDraftInput.data.title = 'test publication for threshold analysis';
    baseDraftInput.data.doi = undefined;
    const baseTitle = baseDraftInput.data.title;

    const { verifyRes } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: baseDraftInput,
    });

    expect(verifyRes.status).toBe(200);

    const testCases = [
      {
        title: 'test publication for threshold analy111',
        similarity: '81%, length ratio = 100%',
        expectDuplicate: true,
      },
      {
        title: 'test publication for threshold an123456',
        similarity: '69%, length ratio = 100%',
        expectDuplicate: false,
      },
    ];

    for (const { title, expectDuplicate } of testCases) {
      const variantDraft = loadMockJson('draftInput.json');
      variantDraft.data.title = title;
      variantDraft.data.doi = undefined;

      const { researchItemId } = await saveDraft(
        client,
        cookie,
        entityUserId,
        variantDraft
      );

      const res = await client
        .get(`/api/rest/research-items/${researchItemId}`)
        .set('Cookie', cookie);

      expect(res.body.data.title).toBe(variantDraft.data.title);
      expect(res.status).toBe(200);
      const { duplicates } = res.body;

      if (expectDuplicate) {
        expect(duplicates.length).toBeGreaterThanOrEqual(1);
        expect(duplicates[0].researchItem.data.title).toBe(baseTitle);
      } else {
        expect(duplicates.length).toBe(0);
      }
    }
  });

  it('should detect duplicates when title length ratio > 90% regardless of similarity', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    const baseDraftInput = loadMockJson('draftInput.json');
    baseDraftInput.data.title = 'test publication for threshold analysis';
    baseDraftInput.data.doi = undefined;
    const baseTitle = baseDraftInput.data.title;

    const { verifyRes } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: baseDraftInput,
    });

    expect(verifyRes.status).toBe(200);

    const testCases = [
      {
        title: 'test publication for threshold analy111',
        similarity: '81%, length ratio = 100%',
        expectDuplicate: true,
      },
      {
        title: 'test publication for threshold anal',
        similarity: '85%, length ratio = 89%',
        expectDuplicate: false,
      },
    ];

    for (const { title, expectDuplicate } of testCases) {
      const variantDraft = loadMockJson('draftInput.json');
      variantDraft.data.title = title;
      variantDraft.data.doi = undefined;

      const { researchItemId } = await saveDraft(
        client,
        cookie,
        entityUserId,
        variantDraft
      );

      const res = await client
        .get(`/api/rest/research-items/${researchItemId}`)
        .set('Cookie', cookie);

      expect(res.body.data.title).toBe(variantDraft.data.title);
      expect(res.status).toBe(200);
      const { duplicates } = res.body;

      if (expectDuplicate) {
        expect(duplicates.length).toBeGreaterThanOrEqual(1);
        expect(duplicates[0].researchItem.data.title).toBe(baseTitle);
      } else {
        expect(duplicates.length).toBe(0);
      }
    }
  });

  it('should detect duplicates when author similarity > 60% regardless of length ratio', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);

    const baseDraftInput = loadMockJson('draftInput.json');
    baseDraftInput.data.doi = undefined;

    const { verifyRes } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: baseDraftInput,
    });

    expect(verifyRes.status).toBe(200);

    const testCases = [
      {
        authors: [{ name: 'Doe John' }, { name: 'Smith Simpson John Victor' }],
        similarity: '100%, length ratio = 100%',
        expectDuplicate: true,
      },
      {
        authors: [{ name: 'Doe John' }, { name: 'Smith Simpson John 123456' }],
        similarity: '62%, length ratio = 100%',
        expectDuplicate: true,
      },
      {
        authors: [{ name: 'Doe John' }, { name: 'Smith Simpson Joh1 123456' }],
        similarity: '56%, length ratio = 100%',
        expectDuplicate: false,
      },
    ];

    for (const { authors, expectDuplicate } of testCases) {
      const variantDraft = loadMockJson('draftInput.json');
      variantDraft.data.doi = undefined;
      variantDraft.authors = authors.map((a, i) => ({
        name: a.name,
        researchEntityId: null,
        position: i,
        isCorrespondingAuthor: false,
        isFirstCoauthor: false,
        isLastCoauthor: false,
        isOralPresentation: false,
      }));

      const { researchItemId } = await saveDraft(
        client,
        cookie,
        entityUserId,
        variantDraft
      );

      const res = await client
        .get(`/api/rest/research-items/${researchItemId}`)
        .set('Cookie', cookie);

      expect(res.body.data.title).toBe(variantDraft.data.title);
      expect(res.status).toBe(200);
      const { duplicates } = res.body;

      if (expectDuplicate) {
        expect(duplicates.length).toBeGreaterThanOrEqual(1);
      } else {
        expect(duplicates.length).toBe(0);
      }
    }
  });

  it('should detect duplicates when author length ratio > 90% regardless of similarity', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);
    const baseDraftInput = loadMockJson('draftInput.json');
    baseDraftInput.data.doi = undefined;

    const { verifyRes } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: baseDraftInput,
    });

    expect(verifyRes.status).toBe(200);

    const testCases = [
      {
        authors: [{ name: 'Doe John' }, { name: 'Smith Simpson John Victor' }],
        similarity: '100%, length ratio = 100%',
        expectDuplicate: true,
      },
      {
        authors: [{ name: 'Doe John' }, { name: 'Smith Simpson John Vi' }],
        similarity: '80%, length ratio = 87%',
        expectDuplicate: false,
      },
    ];

    for (const { authors, expectDuplicate } of testCases) {
      const variantDraft = loadMockJson('draftInput.json');
      variantDraft.data.doi = undefined;
      variantDraft.authors = authors.map((a, i) => ({
        name: a.name,
        researchEntityId: null,
        position: i,
        isCorrespondingAuthor: false,
        isFirstCoauthor: false,
        isLastCoauthor: false,
        isOralPresentation: false,
      }));

      const { researchItemId } = await saveDraft(
        client,
        cookie,
        entityUserId,
        variantDraft
      );

      const res = await client
        .get(`/api/rest/research-items/${researchItemId}`)
        .set('Cookie', cookie);

      expect(res.body.data.title).toBe(variantDraft.data.title);
      expect(res.status).toBe(200);
      const { duplicates } = res.body;

      if (expectDuplicate) {
        expect(duplicates.length).toBeGreaterThanOrEqual(1);
      } else {
        expect(duplicates.length).toBe(0);
      }
    }
  });

  it('should not show duplicates after removing DOI from draft publication', async () => {
    const { response, cookie } = await login(app, loginUsername1);
    expect(response.status).toBe(302);
    // Step 1: Save and verify the first draft
    const draftInput1 = loadMockJson('draftInput.json');
    const affiliation = {
      instituteId: 714,
      name: 'Italian Institute of Technology',
    };

    const { verifyRes, verifiedEntry } = await saveAndVerifyDraft({
      client,
      cookie,
      entityUserId,
      draftInput: draftInput1,
      affiliation,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifiedEntry[0].length).toBe(1);

    // Step 2: Save a second draft with the same DOI and different authors
    const draftInput2 = loadMockJson('draftInput.json');
    draftInput2.authors = [
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
    const { researchItemId: duplicateId } = await saveDraft(
      client,
      cookie,
      entityUserId,
      draftInput2
    );

    const draftDetailsRes = await client
      .get(`/api/rest/research-items/${duplicateId}`)
      .set('Cookie', cookie);

    expect(draftDetailsRes.body.data.title).toBe(draftInput2.data.title);
    expect(draftDetailsRes.status).toBe(200);

    // Step 3: Edit the draft to remove the DOI, title, and authors
    const draft = draftDetailsRes.body;
    draft.data.doi = '1234';

    const updateRes = await client
      .put(`/api/rest/research-entities/${entityUserId}/draft`)
      .set('Cookie', cookie)
      .send(draft);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.doi).toBe('1234');

    // Step 4: Verify no duplicates are present anymore
    const res = await client
      .get(`/api/rest/research-items/${duplicateId}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const duplicates = res.body.duplicates;
    expect(Array.isArray(duplicates)).toBe(true);
    expect(duplicates.length).toBe(0);
  });
});
