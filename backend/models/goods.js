// backend/models/goods.js
import pool from '../db.js';

const createGoodsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS goods (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id),
      seller_id INTEGER NOT NULL REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price INTEGER NOT NULL CHECK (price > 0),
      status VARCHAR(50) NOT NULL DEFAULT 'available', -- e.g., 'available', 'sold', 'delisted'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Goods table checked/created successfully.');
  } catch (error) {
    console.error('Error creating goods table:', error);
    throw error;
  }
};

const createGoodsTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS goods_transactions (
      id SERIAL PRIMARY KEY,
      good_id INTEGER NOT NULL REFERENCES goods(id),
      buyer_id INTEGER NOT NULL REFERENCES users(id),
      status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'completed', 'cancelled'
      buyer_verified BOOLEAN DEFAULT false,
      seller_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Goods transactions table checked/created successfully.');
  } catch (error) {
    console.error('Error creating goods transactions table:', error);
    throw error;
  }
};

export { createGoodsTable, createGoodsTransactionsTable };
