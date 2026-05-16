import pool from '../backend/db.js';

const createSystemStateTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS system_state (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO system_state (key, value)
    VALUES ('crisis_mode', '{"enabled": false, "active_crises": []}')
    ON CONFLICT (key) DO NOTHING;
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: System state table created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating system state table:', err);
  }
};

export { createSystemStateTable };
