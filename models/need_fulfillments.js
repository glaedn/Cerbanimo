import pool from '../backend/db.js';

const createNeedFulfillmentTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS need_fulfillments (
      id SERIAL PRIMARY KEY,
      need_id INTEGER REFERENCES needs(id) ON DELETE CASCADE,
      provider_user_id INTEGER REFERENCES users(id),
      provider_community_id INTEGER REFERENCES communities(id),
      resource_id INTEGER REFERENCES resources(id),
      fulfillment_percentage NUMERIC(5,2) DEFAULT 100.00,
      notes TEXT,
      status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'verified', 'completed'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(query);
    console.log('PostgreSQL: Need fulfillment table created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating need fulfillment table:', err);
  }
};

export { createNeedFulfillmentTable };
