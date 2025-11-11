import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#root/app_initial.mjs';
import ResearchItem from '#root/models/ResearchItem.mjs';
import {
  truncateAllTables,
  loadMockJson,
  mockFetch,
  login,
  setupTestData,
} from './utils/testUtils.mjs';
import sequelize from '#root/services/Sequelize.mjs';

let client;
let username = 'testuser1@.it';

beforeAll(async () => {
  client = request(app);
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

async function queryExternalItem(originIdOrDoi) {
  const { response, cookie } = await login(app, username);
  expect(response.status).toBe(302);

  return client
    .get('/api/rest/research-items/external')
    .set('Cookie', cookie)
    .query({ originIdOrDoi });
}

describe('Live API tests with mocked fetch', async () => {
  it('should return data for originIdentifier (W2319078267)', async () => {
    const originId = 'W2319078267';
    const mockData = loadMockJson('W2319078267.json');
    mockFetch(200, mockData, `https://api.openalex.org/works/${originId}`);

    const res = await queryExternalItem(originId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data.year', '2016');

    const savedItem = await ResearchItem.findExternal(
      { originIdentifier: originId.toUpperCase() },
      'external',
      null
    );
    expect(savedItem).not.toBeNull();
  });

  it('should return data for DOI (10.1007/s10404-023-02629-4)', async () => {
    const mockData = loadMockJson('101007.json');
    const originId = '10.1007/s10404-023-02629-4';
    mockFetch(
      200,
      mockData,
      `https://api.openalex.org/works/https://doi.org/${originId}`
    );

    const res = await queryExternalItem(originId);
    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toHaveProperty(
      'data.source.title',
      'Microfluidics and Nanofluidics'
    );

    const savedItem = await ResearchItem.findExternal(
      { doi: originId },
      'external',
      null
    );
    expect(savedItem).not.toBeNull();
  });

  it('should return null for unknown originIdentifier (w1234)', async () => {
    const originId = 'w1234';
    mockFetch(404, {}, `https://api.openalex.org/works/${originId}`);
    const res = await queryExternalItem(originId);
    expect(res.status).toBe(200);
    expect(res.body).toBe(null);

    const savedItem = await ResearchItem.findExternal(
      { originIdentifier: originId.toUpperCase() },
      'external',
      null
    );
    expect(savedItem).toBeNull();
  });

  it('should return null for empty originIdOrDoi', async () => {
    const res = await queryExternalItem('');
    expect(res.status).toBe(200);
    expect(res.body).toBe(null);
  });
});
