import pool from '../db.js';

const DEFAULT_DEV_TOKEN = 'cerbanimo-dev-auth-bypass';
const DEFAULT_DEV_SUB = 'auth0|cerbanimo-dev-test';
const DEFAULT_DEV_EMAIL = 'cerbanimo-dev-test@example.test';
const DEFAULT_DEV_NAME = 'Cerbanimo Dev Tester';

function isEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.CERBANIMO_DEV_AUTH_BYPASS === 'true';
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(/\s+/);
  return /^Bearer$/i.test(scheme || '') ? token : null;
}

function devUser() {
  const email = process.env.CERBANIMO_DEV_AUTH_EMAIL || DEFAULT_DEV_EMAIL;
  const name = process.env.CERBANIMO_DEV_AUTH_NAME || DEFAULT_DEV_NAME;
  return {
    sub: process.env.CERBANIMO_DEV_AUTH_SUB || DEFAULT_DEV_SUB,
    email,
    name,
    nickname: process.env.CERBANIMO_DEV_AUTH_USERNAME || email.split('@')[0],
    picture: process.env.CERBANIMO_DEV_AUTH_PICTURE || null
  };
}

function expectedToken() {
  return process.env.CERBANIMO_DEV_AUTH_TOKEN || DEFAULT_DEV_TOKEN;
}

async function ensureDevUser(user) {
  const username = String(process.env.CERBANIMO_DEV_AUTH_USERNAME || user.nickname || 'cerbanimo-dev-test')
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 50) || 'cerbanimo-dev-test';
  const params = [
    user.sub,
    user.email,
    username,
    user.picture,
    JSON.stringify([
      { name: 'Project Management', level: 3, exp: 0 },
      { name: 'Product Research', level: 2, exp: 0 },
      { name: 'Quality Assurance', level: 2, exp: 0 }
    ]),
    JSON.stringify([
      { name: 'Collective Action' },
      { name: 'Community Projects' },
      { name: 'Automation' }
    ]),
    ['user']
  ];

  const updateResult = await pool.query(
    `UPDATE users
     SET
       email = $2,
       username = $3,
       profile_picture = COALESCE(profile_picture, $4),
       skills = $5::jsonb,
       interests = $6::jsonb,
       roles = $7::text[],
       alpha = TRUE,
       updated_at = NOW()
     WHERE auth0_id = $1
     RETURNING id, username, email, roles, cotokens, skills`,
    params
  );

  if (updateResult.rowCount > 0) {
    return updateResult.rows[0];
  }

  const insertResult = await pool.query(
    `INSERT INTO users (
       auth0_id, email, username, profile_picture, skills, interests, roles, alpha
     )
     VALUES (
       $1, $2, $3, $4,
       $5::jsonb, $6::jsonb, $7::text[], TRUE
     )
     RETURNING id, username, email, roles, cotokens, skills`,
    params
  );
  return insertResult.rows[0];
}

export function isDevAuthRequest(req) {
  return isEnabled() && bearerToken(req) === expectedToken();
}

export async function ensureDevAuthUser() {
  const user = devUser();
  const dbUser = await ensureDevUser(user);
  return { authUser: user, dbUser };
}

export function withDevAuthBypass(jwtMiddleware) {
  return async (req, res, next) => {
    if (!isDevAuthRequest(req)) {
      return jwtMiddleware(req, res, next);
    }

    try {
      const { authUser: user } = await ensureDevAuthUser();
      req.auth = {
        payload: {
          sub: user.sub,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
          picture: user.picture,
          scope: 'openid profile email read:profile write:profile'
        }
      };
      req.devAuthBypass = true;
      return next();
    } catch (error) {
      console.error('Dev auth bypass failed:', error);
      return res.status(500).json({ message: 'Dev auth bypass failed' });
    }
  };
}

export { isEnabled as isDevAuthBypassEnabled, devUser as getDevAuthUser, expectedToken as getDevAuthToken };
