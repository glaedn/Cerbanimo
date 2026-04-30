import 'dotenv/config';
import pool from './db.js';
import { alterExistingTables } from '../models/alter_tables_v2.js';

async function runMigration() {
  try {
    console.log('Running migration...');
    await alterExistingTables();
    console.log('Migration complete.');

    // Verify columns
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'skills'
      AND column_name IN ('status', 'creator_id')
    `);
    console.log('Verification:', res.rows);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
