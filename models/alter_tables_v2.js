import pool from '../backend/db.js';

const alterExistingTables = async () => {
  const alterTasksQuery = `
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS verification_model VARCHAR(50) DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS impact_depth INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reward_floor INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS reward_ceiling INTEGER,
    ADD COLUMN IF NOT EXISTS decay_factor NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
  `;

  const alterProjectsQuery = `
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS closure_reason TEXT;
  `;

  const alterUsersQuery = `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS story_archetypes TEXT[] DEFAULT '{}';
  `;

  try {
    await pool.query(alterTasksQuery);
    await pool.query(alterProjectsQuery);
    await pool.query(alterUsersQuery);
    console.log('PostgreSQL: Existing tables (tasks, projects, users) altered with new fields.');
  } catch (err) {
    console.error('PostgreSQL: Error altering existing tables:', err);
  }
};

export { alterExistingTables };
