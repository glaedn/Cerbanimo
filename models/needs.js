import pool from '../backend/db.js';

const checkPostGIS = async () => {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'postgis'
      );
    `);
    return result.rows[0].exists;
  } catch (err) {
    console.error('PostgreSQL: Failed checking PostGIS extension:', err);
    return false;
  }
};

const createNeedsTable = async () => {
  const hasPostGIS = await checkPostGIS();

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
      latitude NUMERIC, -- Added (Legacy)
      longitude NUMERIC, -- Added (Legacy)
      ${hasPostGIS ? 'location_point GEOGRAPHY(Point, 4326),' : ''} -- PostGIS point
      urgency_radius NUMERIC, -- in meters
      ${hasPostGIS ? 'pickup_point GEOGRAPHY(Point, 4326),' : ''}
      ${hasPostGIS ? 'dropoff_point GEOGRAPHY(Point, 4326),' : ''}
      discord_message_id VARCHAR(50), -- Added for Discord integration
      discord_thread_id VARCHAR(50), -- Added for Discord integration
      compensation_model VARCHAR(50) DEFAULT 'volunteer', -- Added for Phase 6
      trust_requirements TEXT, -- Added for Phase 6
      visibility VARCHAR(50) DEFAULT 'public', -- Added for Phase 6
      fulfilled_by_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      complexity_score FLOAT DEFAULT 0,
      is_expanded BOOLEAN DEFAULT false,
      linked_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
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
    ${hasPostGIS ? 'CREATE INDEX IF NOT EXISTS idx_needs_location_point ON needs USING GIST(location_point);' : ''}
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

export {
  createNeedsTable,
};
