const pool = require('../../backend/db.js'); // Ensure this path is correct relative to models/

const createProjectsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Can be NULL if creator account is deleted
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      token_pool NUMERIC DEFAULT 0,
      used_tokens NUMERIC DEFAULT 0,
      reserved_tokens NUMERIC DEFAULT 0,
      community_votes JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'planning', -- e.g., 'planning', 'recruiting', 'active', 'completed', 'on_hold', 'cancelled'
      tags TEXT[] DEFAULT '{}',
      visibility VARCHAR(50) DEFAULT 'public', -- e.g., 'public', 'private', 'community_only'
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Removed task_group_ids and user_ids as these are better handled via tasks and their assignments.
  // community_votes might be a separate table or handled by a different mechanism if complex.

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_project_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_project_updated_at') THEN
        CREATE TRIGGER set_project_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_project_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id);
    CREATE INDEX IF NOT EXISTS idx_projects_community_id ON projects(community_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags); -- GIN index for array operations
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Projects table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Projects updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on projects table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating projects table, trigger, or indexes:', err);
  }
};

module.exports = {
  createProjectsTable,
};
