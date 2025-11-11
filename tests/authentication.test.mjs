import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import {
  login,
  logout,
  setupTestData,
  truncateAllTables,
} from './utils/testUtils.mjs';
import sequelize from '#root/services/Sequelize.mjs';
import app from '#root/app_initial.mjs';

let username = 'testuser1@.it';

beforeAll(async () => {
  const transaction = await sequelize.transaction();
  try {
    await truncateAllTables(transaction);
    await setupTestData(transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Authentication: login and logout', () => {
  it('should handle successful login and update last_login', async () => {
    const { cookie } = await login(app, username);
    expect(cookie).toBeDefined();
  });

  it('should fail if no code is provided', async () => {
    const { cookie } = await login(app, username);
    expect(cookie).toBeDefined();
    const client = request(app);
    const response = await client
      .get('/login')
      .set('Cookie', cookie);
    expect(response.status).toBe(400);
    expect(response.text).toContain('Authorization code is missing');
  });

  it('should redirect to /login-failed if user not found', async () => {
    const output = await login(app, 'nonexistent@.it');
    expect(output.error).toBe('User not found');
  });

  it('should login and then logout successfully', async () => {
    const { cookie } = await login(app, username);
    expect(cookie).toBeDefined();

    const logoutRes = await logout(app, cookie);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out');
  });
});
