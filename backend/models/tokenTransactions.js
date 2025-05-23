const pool = require('../db'); // Assuming db.js contains the PostgreSQL pool configuration

const createTokenTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Can be null for system-issued tokens
      receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Can be null if tokens are "spent" to the system
      amount INTEGER NOT NULL CHECK (amount <> 0), -- Ensure amount is not zero; can be positive or negative
      reason TEXT, -- e.g., 'task_completion_reward', 'exchange_fee', 'manual_grant', 'purchase_service_X'
      related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      related_exchange_id INTEGER, -- No direct FK yet, depends on how exchanges are logged
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT -- Additional details or metadata
    );
  `;
  // Note: For a robust system, receiver_id should probably be NOT NULL if it represents a user receiving tokens.
  // If tokens can be "destroyed" or "spent" to the system, then null might be okay, or a system user ID could be used.
  // For now, allowing NULL as per initial thought on `awardTokens` where sender could be null.
  // Let's make receiver_id NOT NULL as tokens are generally awarded to someone.
  // And sender_id can be null for system grants.
  // The `awardTokens` service already handles positive amount check.
  // The CHECK (amount <> 0) is a DB level constraint.

  const adjustedQuery = `
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL, 
      receiver_id INTEGER REFERENCES users(id) ON DELETE NOT NULL, -- Tokens are awarded to a user
      amount INTEGER NOT NULL CHECK (amount > 0), -- Typically, transactions log positive amounts for awards
      reason VARCHAR(255), 
      related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      related_exchange_id INTEGER, 
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT 
    );
  `;
  // The `awardTokens` service handles sender deduction separately, so this table is more of a log of credits.
  // If it were a full ledger, debits and credits would be logged, possibly with a transaction_type.
  // For now, this schema aligns with `awardTokens` awarding positive amounts.

  try {
    await pool.query(adjustedQuery); // Using the adjustedQuery
    console.log('Token_transactions table created successfully (or already exists).');
  } catch (err) {
    console.error('Error creating token_transactions table:', err);
    throw err;
  }
};

// Trigger for updated_at (not strictly necessary for a transaction log table, but good practice if it might be edited)
const createTokenTransactionsUpdatedAtTrigger = async () => {
  const triggerFunctionQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  // Add updated_at column to the table if it's missing and this trigger is desired
  // For now, assuming token_transactions are immutable and don't need updated_at.
  // If they do, the schema above needs: updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

  // const addColumnQuery = `
  //   ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  // `;

  // const triggerQuery = `
  //   DROP TRIGGER IF EXISTS token_transactions_updated_at_trigger ON token_transactions;
  //   CREATE TRIGGER token_transactions_updated_at_trigger
  //   BEFORE UPDATE ON token_transactions
  //   FOR EACH ROW
  //   EXECUTE FUNCTION update_updated_at_column();
  // `;
  try {
    // await pool.query(triggerFunctionQuery); // Ensure function exists
    // await pool.query(addColumnQuery); // Ensure column exists
    // await pool.query(triggerQuery); // Create trigger
    // console.log('Token_transactions updated_at handling configured (if applicable).');
    console.log('Token_transactions table does not use an updated_at trigger by default.');
  } catch (err) {
    console.error('Error configuring token_transactions updated_at trigger:', err);
  }
};


module.exports = {
  createTokenTransactionsTable,
  // createTokenTransactionsUpdatedAtTrigger // Only export if you implement and want it
};
