const pool = require('../backend/db.js');

const createResonancesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS resonances (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      intention_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, intention_id)
    );
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_resonances_user_id ON resonances(user_id);
    CREATE INDEX IF NOT EXISTS idx_resonances_intention_id ON resonances(intention_id);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Resonances table created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on resonances table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating resonances table or indexes:', err);
  }
};

module.exports = {
  createResonancesTable,
};