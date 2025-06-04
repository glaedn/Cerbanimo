const pool = require('../../backend/db.js'); // Standardized path

const createResourcesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100),
      skill_ids INTEGER[] DEFAULT '{}', -- Optional: skills related to using or managing this resource
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'available', -- e.g., 'available', 'in_use', 'reserved', 'maintenance', 'retired'
      quantity NUMERIC,
      unit VARCHAR(50), -- e.g., 'items', 'hours', 'licenses'
      location_description TEXT, -- e.g., 'Room 301', 'Online URL', 'Contact for access'
      access_instructions TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_resource_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_resource_updated_at') THEN
        CREATE TRIGGER set_resource_updated_at
        BEFORE UPDATE ON resources
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_resource_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
    CREATE INDEX IF NOT EXISTS idx_resources_community_id ON resources(community_id);
    CREATE INDEX IF NOT EXISTS idx_resources_project_id ON resources(project_id);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Resources table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Resources updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on resources table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating resources table, trigger, or indexes:', err);
  }
};

module.exports = {
  createResourcesTable,
};
