import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 20, // Limit connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

export default pool;