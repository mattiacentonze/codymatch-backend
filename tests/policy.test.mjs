import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as auth from '#root/services/Authentication.mjs';
import { isLoggedIn, hasToken } from '#root/services/Policy.mjs';
import BearerToken from '#root/models/BearerToken.mjs';

// Helper functions to create mock request and response objects
const createMockReq = (session = {}) => ({
  session,
  get: vi.fn(),
});

const createMockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const next = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  next.mockReset();
});

describe('isLoggedIn', () => {
  it('should return 401 if token is missing', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    await isLoggedIn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Must be logged in to access this route',
    });
  });

  it('should return 401 if jwt.decode returns null', async () => {
    const req = createMockReq({ token: 'fakeToken' });
    const res = createMockRes();
    vi.spyOn(jwt, 'decode').mockReturnValue(null);
    await isLoggedIn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 if token is expired and auth.getTokens returns not ok', async () => {
    // Create an expired token by setting exp in the past
    const expiredTime = Math.floor(Date.now() / 1000) - 10;
    const decodedToken = {
      header: { kid: 'test-kid' },
      payload: { exp: expiredTime },
    };
    const req = createMockReq({
      token: 'fakeToken',
      refresh_token: 'fakeRefresh',
    });
    const res = createMockRes();

    vi.spyOn(jwt, 'decode').mockReturnValue(decodedToken);
    vi.spyOn(auth, 'getTokens').mockResolvedValue({ ok: false });

    await isLoggedIn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should update tokens and call next if token is expired but auth.getTokens returns valid tokens and jwt.verify succeeds', async () => {
    const expiredTime = Math.floor(Date.now() / 1000) - 10;
    const decodedToken = {
      header: { kid: 'test-kid' },
      payload: { exp: expiredTime },
    };
    const req = createMockReq({
      token: 'oldToken',
      refresh_token: 'oldRefresh',
    });
    const res = createMockRes();

    vi.spyOn(jwt, 'decode').mockReturnValue(decodedToken);
    vi.spyOn(auth, 'getTokens').mockResolvedValue({
      ok: true,
      access_token: 'newToken',
      refresh_token: 'newRefresh',
    });
    vi.spyOn(auth, 'getPublicKey').mockResolvedValue('publicKey');

    // Simulate jwt.verify calling the callback without error
    vi.spyOn(jwt, 'verify').mockImplementation(
      (_token, _key, _options, callback) => {
        callback(null);
      }
    );

    await isLoggedIn(req, res, next);
    expect(req.session.token).toBe('newToken');
    expect(req.session.refresh_token).toBe('newRefresh');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if jwt.verify returns an error', async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    const decodedToken = {
      header: { kid: 'test-kid' },
      payload: { exp: futureTime },
    };
    const req = createMockReq({ token: 'validToken' });
    const res = createMockRes();

    vi.spyOn(jwt, 'decode').mockReturnValue(decodedToken);
    vi.spyOn(auth, 'getPublicKey').mockResolvedValue('publicKey');

    // Simulate jwt.verify calling the callback with an error
    vi.spyOn(jwt, 'verify').mockImplementation(
      (_token, _key, _options, callback) => {
        callback(new Error('Invalid token'));
      }
    );

    await isLoggedIn(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 401,
      message: 'Must be logged in to access this route',
    });
  });

  it('should call next if token is valid and jwt.verify succeeds', async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    const decodedToken = {
      header: { kid: 'test-kid' },
      payload: { exp: futureTime },
    };
    const req = createMockReq({ token: 'validToken' });
    const res = createMockRes();

    vi.spyOn(jwt, 'decode').mockReturnValue(decodedToken);
    vi.spyOn(auth, 'getPublicKey').mockResolvedValue('publicKey');

    vi.spyOn(jwt, 'verify').mockImplementation(
      (_token, _key, _options, callback) => {
        callback(null);
      }
    );

    await isLoggedIn(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('hasToken', () => {
  it('should return 403 if the Authorization header is missing', async () => {
    const req = createMockReq();
    req.get = vi.fn().mockReturnValue(undefined);
    const res = createMockRes();

    await hasToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'Bearer token not found',
    });
  });

  it('should return 403 if the Authorization header does not start with "bearer "', async () => {
    const req = createMockReq();
    req.get = vi.fn().mockReturnValue('Token abcdef');
    const res = createMockRes();

    await hasToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'Bearer token not found',
    });
  });

  it('should call next if a valid token is found', async () => {
    const req = createMockReq();
    req.get = vi.fn().mockReturnValue('Bearer validToken');
    const res = createMockRes();

    // Simulate a database query returning a token record
    vi.spyOn(BearerToken, 'findAll').mockResolvedValue([
      { token: 'hashedToken', name: 'Test Token' },
    ]);
    // Simulate bcrypt.compare returning true for a valid token
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    await hasToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 if no token record matches', async () => {
    const req = createMockReq();
    req.get = vi.fn().mockReturnValue('Bearer invalidToken');
    const res = createMockRes();

    vi.spyOn(BearerToken, 'findAll').mockResolvedValue([
      { token: 'hashedToken', name: 'Test Token' },
    ]);
    // Simulate bcrypt.compare always returning false
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await hasToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 403,
      message: 'Invalid token',
    });
  });

  it('should return 500 if a database error occurs', async () => {
    const req = createMockReq();
    req.get = vi.fn().mockReturnValue('Bearer someToken');
    const res = createMockRes();

    vi.spyOn(BearerToken, 'findAll').mockRejectedValue(new Error('DB error'));

    await hasToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 500,
      message: 'Server error',
    });
  });
});
