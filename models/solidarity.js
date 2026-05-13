import pool from '../backend/db.js';

const createSolidarityTables = async () => {
  const solidarityPoolsTableQuery = `
    CREATE TABLE IF NOT EXISTS solidarity_pools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      participating_communities INTEGER[] DEFAULT '{}',
      total_balance NUMERIC(36,18) DEFAULT 0,
      governance_model JSONB DEFAULT '{
        "vote_threshold": 0.6,
        "max_draw_percentage": 0.2
      }'::jsonb,
      contribution_schedule JSONB DEFAULT '{
        "percentage": 5,
        "frequency": "monthly"
      }'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const solidarityDrawsTableQuery = `
    CREATE TABLE IF NOT EXISTS solidarity_draws (
      id SERIAL PRIMARY KEY,
      pool_id INTEGER REFERENCES solidarity_pools(id) ON DELETE CASCADE,
      requesting_community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      amount_requested NUMERIC(36,18) NOT NULL,
      purpose TEXT,
      crisis_level VARCHAR(32),
      status VARCHAR(32) DEFAULT 'proposed', -- 'proposed', 'approved', 'rejected', 'disbursed'
      disbursed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(solidarityPoolsTableQuery);
    await pool.query(solidarityDrawsTableQuery);
    console.log('PostgreSQL: Solidarity tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating solidarity tables:', err);
  }
};

export { createSolidarityTables };
