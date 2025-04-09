const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

// Token Transactions schema creation
const createTokenTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS token_transactions (
      id SERIAL PRIMARY KEY,
      sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      receiver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      amount NUMERIC NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('PostgreSQL: Token Transactions table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating token_transactions table:', err);
  }
};

module.exports = {
  createTokenTransactionsTable
};
