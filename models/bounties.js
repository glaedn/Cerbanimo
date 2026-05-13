import pool from '../backend/db.js';

const createBountyTables = async () => {
  const bountyTableQuery = `
    CREATE TABLE IF NOT EXISTS bounties (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      posted_by_community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      treasury_source VARCHAR(64) DEFAULT 'cotoken_balance', -- 'cotoken_balance' | 'solidarity_fund'
      skill_id INTEGER REFERENCES skills(id),
      reward_amount NUMERIC(36,18) NOT NULL,
      deliverable_description TEXT,
      status VARCHAR(32) DEFAULT 'open', -- 'open', 'claimed', 'verified', 'paid', 'cancelled'
      claimed_by_user_id INTEGER REFERENCES users(id),
      verification_id INTEGER, -- FK to verifications table if needed
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(bountyTableQuery);
    console.log('PostgreSQL: Bounty tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating bounty tables:', err);
  }
};

export { createBountyTables };
