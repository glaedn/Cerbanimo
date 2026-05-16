import pool from '../backend/db.js';

const createTokenTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Allowed NULL for burns/system fees
      amount NUMERIC(36,18) NOT NULL CHECK (amount > 0),
      reason VARCHAR(255),
      related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      related_exchange_id INTEGER REFERENCES exchanges(id) ON DELETE SET NULL,
      tx_hash TEXT,
      chain TEXT,
      on_chain_status VARCHAR(50), -- 'pending', 'confirmed', 'failed'
      transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
  `;

  try {
    await pool.query(query);
    console.log('Token_transactions table created successfully (or already exists).');
  } catch (err) {
    console.error('Error creating token_transactions table:', err);
    throw err;
  }
};

const createTokenTransactionsUpdatedAtTrigger = async () => {
  try {
    console.log('Token_transactions table does not use an updated_at trigger by default.');
  } catch (err) {
    console.error('Error configuring token_transactions updated_at trigger:', err);
  }
};


export {
  createTokenTransactionsTable,
};
