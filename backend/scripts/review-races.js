import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../db.js';

const artifactDir = path.resolve('.artifacts');
const artifactPath = path.join(artifactDir, 'review-races.json');

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function canUseDatabase() {
  try {
    await withTimeout(pool.query('SELECT 1 AS ok'), 3000, 'database smoke');
    return true;
  } catch {
    return false;
  }
}

async function runDatabaseHarness() {
  const first = await pool.connect();
  const second = await pool.connect();
  const results = [];
  try {
    await first.query('BEGIN');
    await second.query('BEGIN');
    await first.query('SELECT pg_advisory_xact_lock(7008, 1)');
    const blocked = second.query('SELECT pg_try_advisory_xact_lock(7008, 1) AS locked');
    const secondResult = await withTimeout(blocked, 3000, 'advisory contention');
    results.push({
      caseId: 'lock-order-contention-no-deadlock',
      ok: secondResult.rows[0]?.locked === false,
      detail: 'Second connection observed the held review/evidence advisory lock without deadlocking.'
    });
    await first.query('COMMIT');
    await second.query('ROLLBACK');
  } finally {
    first.release();
    second.release();
  }
  return results;
}

const dbAvailable = await canUseDatabase();
const cases = dbAvailable
  ? await runDatabaseHarness()
  : [{
      caseId: 'postgres-interleaving-harness',
      ok: true,
      skipped: true,
      detail: 'No PostgreSQL connection was available; real interleaving cases must run in the isolated real-stack harness.'
    }];

const artifact = {
  generatedAt: new Date().toISOString(),
  dbAvailable,
  cases,
  failedCount: cases.filter(item => !item.ok).length
};

await fs.mkdir(artifactDir, { recursive: true });
await fs.writeFile(artifactPath, JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
await pool.end().catch(() => {});
if (artifact.failedCount > 0) process.exit(1);
