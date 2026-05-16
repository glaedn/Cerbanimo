import pool from '../backend/db.js';

const createImpactReceiptTables = async () => {
  const impactReceiptsTableQuery = `
    CREATE TABLE IF NOT EXISTS impact_receipts (
      id SERIAL PRIMARY KEY,
      receipt_hash VARCHAR(128) UNIQUE,   -- SHA-256 of the core fields, blockchain-ready
      aid_event_id INTEGER,               -- references the triggering aid event (e.g., reciprocity_ledger_id)
      provider_community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      recipient_community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      aid_type VARCHAR(64),
      quantity NUMERIC,
      unit VARCHAR(32),
      verified_by INTEGER[],              -- verifier user IDs
      verification_method VARCHAR(32),    -- 'peer', 'quorum', 'oracle'
      issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      narrative TEXT                      -- human-readable story attached to the receipt
    );
  `;

  try {
    await pool.query(impactReceiptsTableQuery);
    console.log('PostgreSQL: Impact receipt tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating impact receipt tables:', err);
  }
};

export { createImpactReceiptTables };
