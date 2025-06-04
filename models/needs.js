const pool = require('../../backend/db.js'); // Standardized path

const createNeedsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS needs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL, -- Renamed from 'title'
      description TEXT NOT NULL,
      category VARCHAR(100), -- Added
      quantity_needed INTEGER DEFAULT 1, -- Added
      urgency VARCHAR(50) DEFAULT 'medium', -- e.g., 'low', 'medium', 'high', 'critical'
      status VARCHAR(50) DEFAULT 'open', -- e.g., 'open', 'in_progress', 'fulfilled', 'closed', 'expired'
      requestor_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Renamed from user_id, now nullable due to check constraint
      requestor_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL, -- Renamed from community_id
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      skill_ids INTEGER[] DEFAULT '{}', -- Array of skill IDs (FK to skills.id)
      required_before_date DATE, -- Added
      location_text TEXT, -- Added, replacing/clarifying 'location_requirements'
      latitude NUMERIC, -- Added
      longitude NUMERIC, -- Added
      fulfilled_by_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT check_requestor CHECK (requestor_user_id IS NOT NULL OR requestor_community_id IS NOT NULL) -- Added
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_need_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_need_updated_at') THEN
        CREATE TRIGGER set_need_updated_at
        BEFORE UPDATE ON needs
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_need_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_needs_requestor_user_id ON needs(requestor_user_id); -- Renamed
    CREATE INDEX IF NOT EXISTS idx_needs_requestor_community_id ON needs(requestor_community_id); -- Renamed
    CREATE INDEX IF NOT EXISTS idx_needs_project_id ON needs(project_id);
    CREATE INDEX IF NOT EXISTS idx_needs_status ON needs(status);
    CREATE INDEX IF NOT EXISTS idx_needs_urgency ON needs(urgency); -- Added
    CREATE INDEX IF NOT EXISTS idx_needs_category ON needs(category); -- Added
    CREATE INDEX IF NOT EXISTS idx_needs_skill_ids ON needs USING GIN(skill_ids);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Needs table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Needs updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on needs table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating needs table, trigger, or indexes:', err);
  }
};

module.exports = {
  createNeedsTable,
};
