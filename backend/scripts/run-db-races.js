import { spawnSync } from 'node:child_process';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

const connectionString = process.env.PACKET008C_POSTGRES_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.log('Database-backed review and settlement race tests skipped: no PostgreSQL URL is configured.');
  process.exit(0);
}

for (const script of ['review-races.js', 'settlement-races.js']) {
  const result = spawnSync(process.execPath, [`backend/scripts/${script}`], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
