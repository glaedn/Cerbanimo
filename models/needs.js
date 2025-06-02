const pool = require('../db'); // Assuming db.js contains the PostgreSQL pool configuration

const createNeedsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS needs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      quantity_needed NUMERIC,
      urgency VARCHAR(50) DEFAULT 'medium',
      tags TEXT[],
      constraints JSONB,
      duration_type VARCHAR(50),
      duration_details JSONB,
      requestor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      requestor_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'open',
      required_before_date TIMESTAMP,
      location_text VARCHAR(255),
      latitude DECIMAL(9,6),
      longitude DECIMAL(9,6),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Needs table created successfully');
  } catch (err) {
    console.error('Error creating needs table:', err);
    throw err;
  }
};

const createNeedsUpdatedAtTrigger = async () => {
  const triggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS needs_updated_at_trigger ON needs;
    CREATE TRIGGER needs_updated_at_trigger
    BEFORE UPDATE ON needs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `;
  try {
    await pool.query(triggerQuery);
    console.log('Needs updated_at trigger created successfully');
  } catch (err) {
    console.error('Error creating needs updated_at trigger:', err);
    throw err;
  }
};

module.exports = {
  createNeedsTable,
  createNeedsUpdatedAtTrigger,
};
