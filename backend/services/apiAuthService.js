import crypto from 'crypto';
import { auth } from 'express-oauth2-jwt-bearer';
import pool from '../db.js';
import { ensureDevAuthUser, isDevAuthRequest } from '../middlewares/devAuthBypass.js';
import { hashApiToken } from '../../models/kamiya_api.js';
import { sendError } from '../utils/apiEnvelope.js';

export const API_SCOPES = Object.freeze({
  READ_PROFILE: 'profile:read',
  WRITE_PROFILE: 'profile:write',
  READ_PROJECTS: 'projects:read',
  WRITE_PROJECTS: 'projects:write',
  READ_TASKS: 'tasks:read',
  WRITE_TASKS: 'tasks:write',
  READ_COMMUNITIES: 'communities:read',
  WRITE_COMMUNITIES: 'communities:write',
  READ_STATS: 'stats:read',
  READ_NOTIFICATIONS: 'notifications:read',
  WRITE_NOTIFICATIONS: 'notifications:write',
  SEARCH: 'search:read',
  AI_ROUTE: 'ai:route',
  ACTIONS_READ: 'actions:read',
  ACTIONS_WRITE: 'actions:write',
  ACTIONS_SERVICE: 'actions:service',
  AUTOMATION_READ: 'automation:read',
  AUTOMATION_WRITE: 'automation:write',
  CAPABILITIES_READ: 'capabilities:read',
  MEMORY_WRITE: 'memory:write',
  RENDER_READ: 'render:read',
  TOKENS_WRITE: 'tokens:write'
});

export const DEFAULT_API_TOKEN_SCOPES = [
  API_SCOPES.READ_PROFILE,
  API_SCOPES.READ_PROJECTS,
  API_SCOPES.READ_TASKS,
  API_SCOPES.READ_COMMUNITIES,
  API_SCOPES.READ_STATS,
  API_SCOPES.READ_NOTIFICATIONS,
  API_SCOPES.SEARCH,
  API_SCOPES.AI_ROUTE,
  API_SCOPES.ACTIONS_READ,
  API_SCOPES.ACTIONS_WRITE,
  API_SCOPES.AUTOMATION_READ,
  API_SCOPES.AUTOMATION_WRITE,
  API_SCOPES.CAPABILITIES_READ
];

let jwtCheck = null;

function getJwtCheck() {
  if (!process.env.BACKEND_URL) {
    throw new Error('BACKEND_URL is required for Auth0 API authentication');
  }

  if (!jwtCheck) {
    jwtCheck = auth({
      audience: process.env.BACKEND_URL,
      issuerBaseURL: 'https://dev-i5331ndl5kxve1hd.us.auth0.com/',
      tokenSigningAlg: 'RS256',
      tokenSigningClockTolerance: 300
    });
  }

  return jwtCheck;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
}

export function allScopesForUser(user) {
  const base = new Set(Object.values(API_SCOPES).filter(scope => scope !== API_SCOPES.ACTIONS_SERVICE));
  return [...base].sort();
}

export async function createApiToken({ userId, name, scopes, clientName, expiresAt }) {
  const rawToken = `cerb_${crypto.randomBytes(32).toString('base64url')}`;
  const tokenHash = hashApiToken(rawToken);
  const requestedScopes = Array.isArray(scopes) && scopes.length > 0
    ? scopes
    : DEFAULT_API_TOKEN_SCOPES;
  const allowed = new Set(Object.values(API_SCOPES));
  const normalizedScopes = [...new Set(requestedScopes)]
    .filter(scope => allowed.has(scope))
    .filter(scope => scope !== API_SCOPES.TOKENS_WRITE)
    .filter(scope => scope !== API_SCOPES.ACTIONS_SERVICE);

  const result = await pool.query(
    `INSERT INTO api_tokens (user_id, name, token_hash, scopes, client_name, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, scopes, client_name, expires_at, created_at`,
    [userId, name, tokenHash, normalizedScopes, clientName || null, expiresAt || null]
  );

  return {
    token: rawToken,
    tokenRecord: result.rows[0]
  };
}

async function authenticateApiToken(req, res, next, token) {
  const tokenHash = hashApiToken(token);
  const result = await pool.query(
    `SELECT
       t.id AS token_id,
       t.name AS token_name,
       t.scopes,
       t.client_name,
       t.expires_at,
       u.id AS user_id,
       u.auth0_id,
       u.username,
       u.email,
       u.roles
     FROM api_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1
       AND t.revoked_at IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > NOW())`,
    [tokenHash]
  );

  const record = result.rows[0];
  if (!record) {
    return sendError(req, res, 401, 'Invalid or expired API token');
  }

  await pool.query('UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1', [record.token_id]);

  req.apiAuth = {
    type: 'apiToken',
    tokenId: record.token_id,
    tokenName: record.token_name,
    clientName: record.client_name,
    scopes: record.scopes || []
  };
  req.auth = {
    payload: {
      sub: record.auth0_id,
      scope: (record.scopes || []).join(' ')
    }
  };
  req.user = {
    id: record.user_id,
    username: record.username,
    email: record.email,
    roles: record.roles || []
  };

  return next();
}

export function apiAuthenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return sendError(req, res, 401, 'Authorization bearer token required');
  }

  if (isDevAuthRequest(req)) {
    return ensureDevAuthUser()
      .then(({ authUser, dbUser }) => {
        req.auth = {
          payload: {
            sub: authUser.sub,
            email: authUser.email,
            name: authUser.name,
            nickname: authUser.nickname,
            picture: authUser.picture,
            scope: allScopesForUser(dbUser).join(' ')
          }
        };
        req.user = dbUser || null;
        req.apiAuth = {
          type: 'devAuthBypass',
          clientName: 'cerbanimo-dev-auth-bypass',
          scopes: allScopesForUser(dbUser)
        };
        req.devAuthBypass = true;
        return next();
      })
      .catch(next);
  }

  if (token.startsWith('cerb_')) {
    return authenticateApiToken(req, res, next, token);
  }

  let auth0Middleware;
  try {
    auth0Middleware = getJwtCheck();
  } catch (error) {
    return next(error);
  }

  return auth0Middleware(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      if (req.auth?.payload?.sub) {
        const userResult = await pool.query(
          'SELECT id, username, email, roles FROM users WHERE auth0_id = $1',
          [req.auth.payload.sub]
        );
        const user = userResult.rows[0];
        req.user = user || null;
        req.apiAuth = {
          type: 'auth0',
          scopes: allScopesForUser(user)
        };
      }

      return next();
    } catch (error) {
      return next(error);
    }
  });
}

export function requireScopes(requiredScopes = []) {
  return (req, res, next) => {
    const actorScopes = new Set(req.apiAuth?.scopes || []);
    const missing = requiredScopes.filter(scope => !actorScopes.has(scope));
    if (missing.length > 0) {
      return sendError(req, res, 403, 'Missing required API scope', { missingScopes: missing });
    }
    next();
  };
}

export function requireReadWriteScopes(readScope, writeScope) {
  return (req, res, next) => {
    const required = req.method === 'GET' || req.method === 'HEAD' ? readScope : writeScope;
    return requireScopes([required])(req, res, next);
  };
}
