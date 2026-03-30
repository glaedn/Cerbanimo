const pool = require('../backend/db.js');

const createVerificationTables = async () => {
  const verificationEventsTableQuery = `
    CREATE TABLE IF NOT EXISTS verification_events (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      verifier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      proof_of_work_link TEXT, -- Optional, for oracle model
      accuracy_score NUMERIC, -- Calibrated against quorum
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const disputesTableQuery = `
    CREATE TABLE IF NOT EXISTS disputes (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      opener_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'review', -- 'review', 'resolved', 'closed'
      outcome VARCHAR(50), -- 'upheld', 'overturned', 'split'
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const disputeVotesTableQuery = `
    CREATE TABLE IF NOT EXISTS dispute_votes (
      id SERIAL PRIMARY KEY,
      dispute_id INTEGER REFERENCES disputes(id) ON DELETE CASCADE,
      voter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      vote VARCHAR(50), -- 'uphold', 'overturn', 'split'
      comment TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(verificationEventsTableQuery);
    await pool.query(disputesTableQuery);
    await pool.query(disputeVotesTableQuery);
    console.log('PostgreSQL: Verification and Dispute tables created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating verification tables:', err);
  }
};

module.exports = { createVerificationTables };
