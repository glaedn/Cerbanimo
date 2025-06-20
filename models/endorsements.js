const pool = require('../backend/db.js');

const createEndorsementsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS public.endorsements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
      endorser_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT,
      badge TEXT,
      comment TEXT,
      multiplier DECIMAL(3, 2) DEFAULT 1.0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE (story_node_id, endorser_id)
    );
  `;

  try {
    await pool.query(query);
    console.log('PostgreSQL: endorsements table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating endorsements table:', err);
  }
};

module.exports = { createEndorsementsTable };
