import pool from '../db.js';

const migrateInterests = async () => {
  try {
    console.log('Starting migration for interests table...');

    // Add status column if it doesn't exist
    await pool.query(`
      ALTER TABLE interests
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
    `);

    // Add creator_id column if it doesn't exist
    await pool.query(`
      ALTER TABLE interests
      ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Update existing interests to 'active' if they don't have a status
    await pool.query(`
      UPDATE interests SET status = 'active' WHERE status IS NULL;
    `);

    console.log('Migration for interests table completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateInterests();
