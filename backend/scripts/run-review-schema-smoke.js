import 'dotenv/config';
import { spawn } from 'node:child_process';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const baseConnectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!baseConnectionString) throw new Error('A PostgreSQL URL is required for review schema smoke tests.');

const schemaName = `cerbanimo_review_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const testUrl = new URL(baseConnectionString);
testUrl.searchParams.set('options', `-c search_path=${schemaName}`);
const adminPool = new Pool({ connectionString: baseConnectionString, max: 1 });

function runSmoke() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/review-schema-smoke.js'], {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        PACKET008C_SCHEMA: schemaName,
        PACKET008C_POSTGRES_URL: testUrl.toString(),
        POSTGRES_URL: testUrl.toString(),
        DATABASE_URL: testUrl.toString()
      },
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Review schema smoke exited with code ${code}.`)));
  });
}

try {
  await runSmoke();
} finally {
  await adminPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
  await adminPool.end().catch(() => {});
}
