import 'dotenv/config';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('A PostgreSQL URL is required for settlement race tests.');
const schema = `settlement_race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const q = `"${schema}"`;
const pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 5000 });
const effectStages = ['completion', 'rewards', 'xp', 'dependencies', 'chronicle'];

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

async function createAcceptance() {
  return Number((await pool.query(`INSERT INTO ${q}.acceptances DEFAULT VALUES RETURNING id`)).rows[0].id);
}

async function claim(acceptanceId, { failAfter = null, crashAfterCommit = false } = {}) {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query(`SELECT id FROM ${q}.acceptances WHERE id = $1 FOR UPDATE`, [acceptanceId]);
    const row = (await client.query(
      `INSERT INTO ${q}.settlements (acceptance_id) VALUES ($1)
       ON CONFLICT (acceptance_id) DO UPDATE SET acceptance_id = EXCLUDED.acceptance_id RETURNING id`, [acceptanceId]
    )).rows[0];
    if (failAfter === 'settlement') throw new Error('injected:settlement');
    await new Promise(resolve => setTimeout(resolve, 20));
    await client.query(`UPDATE ${q}.settlements SET status = 'running', attempt_count = attempt_count + 1 WHERE id = $1 AND status = 'queued'`, [row.id]);
    for (const key of effectStages) {
      await client.query(
        `INSERT INTO ${q}.effects (settlement_id, effect_key) VALUES ($1, $2) ON CONFLICT (effect_key) DO NOTHING`,
        [row.id, `${row.id}:${key}`]
      );
      if (failAfter === key) throw new Error(`injected:${key}`);
    }
    await client.query(`UPDATE ${q}.settlements SET status = 'completed' WHERE id = $1`, [row.id]);
    await client.query(`UPDATE ${q}.acceptances SET status = 'settled' WHERE id = $1`, [acceptanceId]);
    if (failAfter === 'before_commit') throw new Error('injected:before_commit');
    await client.query('COMMIT');
    committed = true;
    if (crashAfterCommit) throw new Error('injected:after_commit_before_ack');
    return Number(row.id);
  } catch (error) {
    if (!committed) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function summary(acceptanceId) {
  return (await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM ${q}.settlements WHERE acceptance_id = $1) AS settlements,
            (SELECT COUNT(*)::int FROM ${q}.effects e JOIN ${q}.settlements s ON s.id = e.settlement_id WHERE s.acceptance_id = $1) AS effects,
            (SELECT COALESCE(MAX(attempt_count), 0)::int FROM ${q}.settlements WHERE acceptance_id = $1) AS attempts,
            (SELECT status FROM ${q}.acceptances WHERE id = $1) AS acceptance_status`, [acceptanceId]
  )).rows[0];
}

function assertSummary(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (String(actual[key]) !== String(value)) throw new Error(`${label}: expected ${key}=${value}, received ${actual[key]} (${JSON.stringify(actual)})`);
  }
}

try {
  await setup();

  const failureStages = ['settlement', ...effectStages, 'before_commit'];
  for (const stage of failureStages) {
    const acceptanceId = await createAcceptance();
    await claim(acceptanceId, { failAfter: stage }).then(
      () => { throw new Error(`Failure injection at ${stage} unexpectedly committed.`); },
      error => { if (error.message !== `injected:${stage}`) throw error; }
    );
    assertSummary(await summary(acceptanceId), { settlements: 0, effects: 0, attempts: 0, acceptance_status: 'pending' }, `rollback after ${stage}`);
    await claim(acceptanceId);
    assertSummary(await summary(acceptanceId), { settlements: 1, effects: effectStages.length, attempts: 1, acceptance_status: 'settled' }, `recovery after ${stage}`);
  }

  const concurrentAcceptanceId = await createAcceptance();
  const ids = await Promise.all([claim(concurrentAcceptanceId), claim(concurrentAcceptanceId), claim(concurrentAcceptanceId)]);
  const concurrentSummary = await summary(concurrentAcceptanceId);
  if (new Set(ids).size !== 1) throw new Error(`Concurrent claims created multiple settlement IDs: ${ids.join(', ')}`);
  assertSummary(concurrentSummary, { settlements: 1, effects: effectStages.length, attempts: 1, acceptance_status: 'settled' }, 'concurrent replay');

  const crashAcceptanceId = await createAcceptance();
  await claim(crashAcceptanceId, { crashAfterCommit: true }).then(
    () => { throw new Error('Post-commit crash injection unexpectedly acknowledged.'); },
    error => { if (error.message !== 'injected:after_commit_before_ack') throw error; }
  );
  const committedBeforeReplay = await summary(crashAcceptanceId);
  assertSummary(committedBeforeReplay, { settlements: 1, effects: effectStages.length, attempts: 1, acceptance_status: 'settled' }, 'post-commit crash');
  const replayId = await claim(crashAcceptanceId);
  const committedAfterReplay = await summary(crashAcceptanceId);
  assertSummary(committedAfterReplay, { settlements: 1, effects: effectStages.length, attempts: 1, acceptance_status: 'settled' }, 'post-commit replay');

  console.log(JSON.stringify({
    ok: true,
    failureStages,
    concurrentClaims: ids.length,
    replayId,
    concurrent: concurrentSummary,
    postCommitCrash: committedAfterReplay,
  }, null, 2));
} finally {
  await pool.query(`DROP SCHEMA IF EXISTS ${q} CASCADE`).catch(() => {});
  await pool.end();
}
