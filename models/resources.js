const pool = require('../../backend/db.js'); // Standardized path

const createResourcesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL, -- Renamed from 'title'
      description TEXT, -- Made nullable
      category VARCHAR(100),
      condition VARCHAR(100), -- Added: e.g., 'new', 'used_good', 'used_fair'
      quantity NUMERIC DEFAULT 1, -- Default added
      unit VARCHAR(50), -- e.g., 'items', 'hours', 'licenses'
      status VARCHAR(50) DEFAULT 'available', -- e.g., 'available', 'in_use', 'reserved', 'maintenance', 'retired'
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Renamed from 'user_id'
      owner_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL, -- Renamed from 'community_id'
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      skill_ids INTEGER[] DEFAULT '{}', -- Optional: skills related to using or managing this resource
      availability_window_start TIMESTAMP WITH TIME ZONE, -- Added
      availability_window_end TIMESTAMP WITH TIME ZONE, -- Added
      is_recurring BOOLEAN DEFAULT FALSE, -- Added
      recurring_details TEXT, -- Added: e.g., 'every Monday 9-11am', 'first Sunday of month'
      location_text TEXT, -- Renamed from 'location_description'
      latitude NUMERIC, -- Added
      longitude NUMERIC, -- Added
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
    CREATE INDEX IF NOT EXISTS idx_resources_owner_user_id ON resources(owner_user_id); -- Renamed
    CREATE INDEX IF NOT EXISTS idx_resources_owner_community_id ON resources(owner_community_id); -- Renamed
    CREATE INDEX IF NOT EXISTS idx_resources_project_id ON resources(project_id);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_resources_condition ON resources(condition); -- Added
    CREATE INDEX IF NOT EXISTS idx_resources_is_recurring ON resources(is_recurring); -- Added
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
