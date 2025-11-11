import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#root/app_initial.mjs';
import {
  truncateAllTables,
  runQuery,
  loadMockJson,
  setupTestData,
  login,
} from './utils/testUtils.mjs';
import sequelize from '#root/services/Sequelize.mjs';

let client;
let username = 'testuser1@.it';

beforeAll(async () => {
  const transaction = await sequelize.transaction();
  try {
    await truncateAllTables(transaction);
    await setupTestData(transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.log(error);
    throw error;
  }

  client = request(app);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('POST /api/rest/research-entities/:researchEntityId/draft', () => {
  it('should save a draft with full metadata and affiliations', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);

    const draftInput = loadMockJson('draftInput.json');
    const entityId = 2;

    const res = await client
      .post(`/api/rest/research-entities/${entityId}/draft`)
      .set('Cookie', cookie)
      .send(draftInput);

    expect(res.status).toBe(200);
    const researchItemId = res.body.researchItem.id;

    expect(res.body.researchItem).toMatchObject({
      kind: 'draft',
      creatorResearchEntityId: 2,
      researchItemTypeId: 1,
      data: {
        title: 'test',
        year: '1999',
        doi: '10.1007/s10404-023-02629-4',
        abstract: 'Test Article',
        source: {
          id: 1090,
          title: 'Nature Climate Change',
          sourceTypeId: 2,
        },
        sourceType: {
          id: 2,
          key: 'journal',
          label: 'Journal',
        },
      },
    });

    expect(res.body.updatedAuthors).toEqual([
      expect.objectContaining({
        name: 'Doe John',
        isFirstCoauthor: true,
        affiliations: [
          { instituteId: 714, name: 'Italian Institute of Technology' },
        ],
      }),
      expect.objectContaining({
        name: 'Smith Simpson John Victor',
        isOralPresentation: true,
        affiliations: [{ instituteId: 502, name: 'University of Salerno' }],
      }),
    ]);

    const dbItem = await runQuery(`
      SELECT *
      FROM research_item
      WHERE id = ${researchItemId}
    `);
    expect(dbItem[0].length).toBe(1);

    const authors = await runQuery(`
      SELECT *
      FROM author
      WHERE research_item_id = ${researchItemId}
    `);
    expect(authors[0].length).toBeGreaterThanOrEqual(2);

    const affiliations = await runQuery(`
      SELECT *
      FROM affiliation
      WHERE author_id IN (SELECT id
                          FROM author
                          WHERE research_item_id = ${researchItemId})
    `);
    expect(affiliations[0].length).toBeGreaterThanOrEqual(2);
  });
  it('should update an existing draft', async () => {
    const { response, cookie } = await login(app, username);
    expect(response.status).toBe(302);
    const itemId = 1;
    const entityId = 2;

    const updateDraftInput = loadMockJson('draftInput.json');
    updateDraftInput.id = itemId;
    updateDraftInput.data.title = 'test2';
    updateDraftInput.data.year = '2025';
    updateDraftInput.data.doi = '10.1007/s10289-023-02629-4';
    updateDraftInput.data.source = {
      id: 3262,
      sourceTypeId: 1,
      title: 'Rob Sens',
    };
    updateDraftInput.data.abstract = 'Test Article2';
    updateDraftInput.data.sourceType = {
      id: 1,
      key: 'book',
      label: 'Book',
    };
    updateDraftInput.authors = [
      {
        position: 0,
        name: 'Doe John1',
        isCorrespondingAuthor: false,
        isFirstCoauthor: false,
        isLastCoauthor: true,
        isOralPresentation: false,
        affiliations: [
          {
            instituteId: 3621,
            name: 'Italian Association for Cancer Research',
          },
        ],
      },
      {
        position: 1,
        name: 'Smith Simpson John Victor1',
        isCorrespondingAuthor: false,
        isFirstCoauthor: false,
        isLastCoauthor: false,
        isOralPresentation: false,
        affiliations: [
          {
            instituteId: 508,
            name: 'University of Palermo',
          },
        ],
      },
      {
        name: 'Lillian Shields',
        affiliations: [{ instituteId: 509, name: 'University of Verona' }],
        position: 2,
        isCorrespondingAuthor: true,
        isFirstCoauthor: false,
        isLastCoauthor: false,
        isOralPresentation: false,
      },
    ];

    const res = await client
      .put(`/api/rest/research-entities/${entityId}/draft`)
      .set('Cookie', cookie)
      .send(updateDraftInput);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('test2');
    expect(res.body.authors).toHaveLength(3);
    expect(res.body.authors[2].name).toBe('Lillian Shields');

    const item = await runQuery(
      `SELECT data FROM research_item WHERE id = ${itemId}`
    );
    expect(item[0][0].data.title).toBe('test2');

    const authorCheck = await runQuery(`
    SELECT name FROM author
    WHERE research_item_id = 1 AND name = 'Lillian Shields'
  `);
    expect(authorCheck[0].length).toBe(1);
  });
});
