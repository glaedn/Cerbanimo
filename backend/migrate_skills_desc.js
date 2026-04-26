import pool from './db.js';
async function migrate() {
  try {
    console.log('Attempting to add description column to skills table...');
    await pool.query('ALTER TABLE skills ADD COLUMN IF NOT EXISTS description TEXT');
    console.log('Successfully added description column to skills table');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}
migrate();
