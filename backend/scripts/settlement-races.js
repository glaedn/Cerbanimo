import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('A PostgreSQL URL is required for settlement race tests.');
const schema = `settlement_race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const q = `"${schema}"`;
const pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 5000 });

async function setup() {
  await pool.query(`CREATE SCHEMA ${q}`);
  await pool.query(`
    CREATE TABLE ${q}.acceptances (id BIGSERIAL PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending');
    CREATE TABLE ${q}.settlements (
      id BIGSERIAL PRIMARY KEY,
      acceptance_id BIGINT UNIQUE NOT NULL REFERENCES ${q}.acceptances(id),
      status TEXT NOT NULL DEFAULT 'queued',
      attempt_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE ${q}.effects (
      id BIGSERIAL PRIMARY KEY,
      settlement_id BIGINT NOT NULL REFERENCES ${q}.settlements(id),
      effect_key TEXT UNIQUE NOT NULL
    );
  `);
}

async function claim(acceptanceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM ${q}.acceptances WHERE id = $1 FOR UPDATE`, [acceptanceId]);
    const row = (await client.query(
      `INSERT INTO ${q}.settlements (acceptance_id) VALUES ($1)
       ON CONFLICT (acceptance_id) DO UPDATE SET acceptance_id = EXCLUDED.acceptance_id RETURNING id`, [acceptanceId]
    )).rows[0];
    await new Promise(resolve => setTimeout(resolve, 20));
    await client.query(`UPDATE ${q}.settlements SET status = 'running', attempt_count = attempt_count + 1 WHERE id = $1 AND status = 'queued'`, [row.id]);
    for (const key of ['completion', 'rewards', 'xp', 'dependencies', 'chronicle']) {
      await client.query(
        `INSERT INTO ${q}.effects (settlement_id, effect_key) VALUES ($1, $2) ON CONFLICT (effect_key) DO NOTHING`,
        [row.id, `${row.id}:${key}`]
      );
    }
    await client.query(`UPDATE ${q}.settlements SET status = 'completed' WHERE id = $1`, [row.id]);
    await client.query(`UPDATE ${q}.acceptances SET status = 'settled' WHERE id = $1`, [acceptanceId]);
    await client.query('COMMIT');
    return Number(row.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await setup();
  const acceptanceId = Number((await pool.query(`INSERT INTO ${q}.acceptances DEFAULT VALUES RETURNING id`)).rows[0].id);
  const ids = await Promise.all([claim(acceptanceId), claim(acceptanceId), claim(acceptanceId)]);
  const summary = (await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM ${q}.settlements) AS settlements,
            (SELECT COUNT(*)::int FROM ${q}.effects) AS effects,
            (SELECT MAX(attempt_count)::int FROM ${q}.settlements) AS attempts,
            (SELECT status FROM ${q}.acceptances WHERE id = $1) AS acceptance_status`, [acceptanceId]
  )).rows[0];
  if (new Set(ids).size !== 1 || Number(summary.settlements) !== 1 || Number(summary.effects) !== 5 || Number(summary.attempts) !== 1 || summary.acceptance_status !== 'settled') {
    throw new Error(`Settlement replay invariant failed: ${JSON.stringify({ ids, summary })}`);
  }
  console.log(JSON.stringify({ ok: true, concurrentClaims: ids.length, ...summary }, null, 2));
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS ${q} CASCADE`).catch(() => {});
  await pool.end();
}
