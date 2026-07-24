import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn()
  }
}));

const { default: pool } = await import('../db.js');
const { default: resolveUser } = await import('./resolveUser.js');

describe('resolveUser middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proceeds without req.user if not authenticated', async () => {
    const req = {};
    const res = {};
    const next = vi.fn();

    await resolveUser(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('resolves and attaches user with roles from db if authenticated', async () => {
    const req = {
      auth: {
        payload: {
          sub: 'auth0|123456'
        }
      }
    };
    const res = {};
    const next = vi.fn();

    const mockUser = {
      id: 15,
      username: 'admin_tester',
      roles: ['admin', 'user']
    };

    pool.query.mockResolvedValueOnce({
      rows: [mockUser],
      rowCount: 1
    });

    await resolveUser(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, username, roles FROM users'),
      ['auth0|123456']
    );
    expect(req.user).toEqual(mockUser);
    expect(req.user.roles).toContain('admin');
    expect(next).toHaveBeenCalled();
  });

  it('handles database error gracefully by returning 500', async () => {
    const req = {
      auth: {
        payload: {
          sub: 'auth0|123456'
        }
      }
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    const next = vi.fn();

    pool.query.mockRejectedValueOnce(new Error('DB failure'));

    await resolveUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error resolving user' });
    expect(next).not.toHaveBeenCalled();
  });
});
