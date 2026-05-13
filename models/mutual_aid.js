import pool from '../backend/db.js';

const createMutualAidTables = async () => {
  const communityTreasuryTableQuery = `
    CREATE TABLE IF NOT EXISTS community_treasury (
      id SERIAL PRIMARY KEY,
      community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE UNIQUE,
      cotoken_balance NUMERIC(36,18) DEFAULT 0,
      trust_reserve NUMERIC(36,18) DEFAULT 0,       -- slow-moving, governance-locked
      solidarity_fund NUMERIC(36,18) DEFAULT 0,     -- cross-community aid pool
      last_reconciled_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const treasuryTransactionsTableQuery = `
    CREATE TABLE IF NOT EXISTS treasury_transactions (
      id SERIAL PRIMARY KEY,
      treasury_id INTEGER REFERENCES community_treasury(id),
      amount NUMERIC(36,18) NOT NULL,
      currency VARCHAR(32) DEFAULT 'cotoken',
      direction VARCHAR(8) NOT NULL, -- 'in' | 'out'
      purpose VARCHAR(64),           -- 'member_contribution', 'bounty_payout', 'aid_sent', 'aid_received', etc.
      related_entity_type VARCHAR(32),
      related_entity_id INTEGER,
      counterparty_community_id INTEGER REFERENCES communities(id),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const reciprocityLedgerTableQuery = `
    CREATE TABLE IF NOT EXISTS community_reciprocity_ledger (
      id SERIAL PRIMARY KEY,
      from_community_id INTEGER REFERENCES communities(id),
      to_community_id INTEGER REFERENCES communities(id),
      aid_type VARCHAR(64),           -- 'resource', 'skill', 'token', 'hosting'
      value_in_cotokens NUMERIC(36,18),
      reference_treaty_id INTEGER REFERENCES federation_treaties(id),
      reference_need_id INTEGER REFERENCES needs(id),
      recorded_at TIMESTAMP DEFAULT NOW()
    );
  `;

  const reciprocityViewQuery = `
    CREATE OR REPLACE VIEW community_balance_of_aid AS
      SELECT
        r1.from_community_id,
        r1.to_community_id,
        SUM(r1.value_in_cotokens) AS total_given,
        (SELECT SUM(r2.value_in_cotokens)
         FROM community_reciprocity_ledger r2
         WHERE r2.from_community_id = r1.to_community_id
           AND r2.to_community_id = r1.from_community_id) AS total_received,
        SUM(r1.value_in_cotokens) - COALESCE((SELECT SUM(r3.value_in_cotokens)
                                            FROM community_reciprocity_ledger r3
                                            WHERE r3.from_community_id = r1.to_community_id
                                              AND r3.to_community_id = r1.from_community_id), 0) AS net_balance
      FROM community_reciprocity_ledger r1
      GROUP BY r1.from_community_id, r1.to_community_id;
  `;

  try {
    await pool.query(communityTreasuryTableQuery);
    await pool.query(treasuryTransactionsTableQuery);
    await pool.query(reciprocityLedgerTableQuery);
    await pool.query(reciprocityViewQuery);
    console.log('PostgreSQL: Mutual aid tables and views created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating mutual aid tables:', err);
  }
};

export { createMutualAidTables };
