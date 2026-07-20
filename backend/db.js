import dotenv from 'dotenv';
import pg from 'pg';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Resolve the backend environment independently of the launch directory.
// Explicit process variables still win because dotenv does not override them.
dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 20, // Limit connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

export default pool;
