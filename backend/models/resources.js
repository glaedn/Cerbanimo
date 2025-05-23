const pool = require('../db'); // Assuming db.js contains the PostgreSQL pool configuration

const createResourcesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      quantity VARCHAR(100),
      condition VARCHAR(100),
      availability_window_start TIMESTAMP,
      availability_window_end TIMESTAMP,
      location_text VARCHAR(255),
      latitude DECIMAL(9,6),
      longitude DECIMAL(9,6),
      is_recurring BOOLEAN DEFAULT FALSE,
      recurring_details TEXT,
      owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      owner_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Resources table created successfully');
  } catch (err) {
    console.error('Error creating resources table:', err);
    throw err;
  }
};

const createUpdatedAtTrigger = async () => {
  const triggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS resources_updated_at_trigger ON resources;
    CREATE TRIGGER resources_updated_at_trigger
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `;
  try {
    await pool.query(triggerQuery);
    console.log('Resources updated_at trigger created successfully');
  } catch (err) {
    console.error('Error creating resources updated_at trigger:', err);
    throw err;
  }
};

module.exports = {
  createResourcesTable,
  createUpdatedAtTrigger,
};
