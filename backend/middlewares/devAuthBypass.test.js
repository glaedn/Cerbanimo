import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(async (sql) => ({
      rows: [],
      rowCount: String(sql).startsWith('UPDATE users') ? 0 : 1
    }))
  }
}));

const { default: pool } = await import('../db.js');
const { withDevAuthBypass } = await import('./devAuthBypass.js');

function req(token = 'cerbanimo-dev-auth-bypass') {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  };
}

function res() {
  return {
    status: vi.fn(function status() { return this; }),
    json: vi.fn(function json() { return this; })
  };
}

describe('dev auth bypass middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls through to Auth0 when disabled', async () => {
    process.env.CERBANIMO_DEV_AUTH_BYPASS = 'false';
    const auth0 = vi.fn((_req, _res, next) => next());
    const next = vi.fn();

    await withDevAuthBypass(auth0)(req(), res(), next);

    expect(auth0).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('falls through to Auth0 in production even when the flag is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CERBANIMO_DEV_AUTH_BYPASS = 'true';
    const auth0 = vi.fn((_req, _res, next) => next());
    const next = vi.fn();

    await withDevAuthBypass(auth0)(req(), res(), next);

    expect(auth0).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('attaches an Auth0-shaped payload and upserts the dev user when enabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CERBANIMO_DEV_AUTH_BYPASS = 'true';
    process.env.CERBANIMO_DEV_AUTH_TOKEN = 'local-token';
    const auth0 = vi.fn();
    const next = vi.fn();
    const request = req('local-token');

    await withDevAuthBypass(auth0)(request, res(), next);

    expect(auth0).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), expect.any(Array));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), expect.any(Array));
    expect(request.auth.payload.sub).toBe('auth0|cerbanimo-dev-test');
    expect(next).toHaveBeenCalled();
  });

  it('updates an existing dev user without inserting a duplicate', async () => {
    pool.query.mockImplementationOnce(async () => ({ rows: [], rowCount: 1 }));
    process.env.NODE_ENV = 'development';
    process.env.CERBANIMO_DEV_AUTH_BYPASS = 'true';
    const auth0 = vi.fn();
    const next = vi.fn();

    await withDevAuthBypass(auth0)(req(), res(), next);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), expect.any(Array));
    expect(next).toHaveBeenCalled();
  });
});
