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
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS resource_requirements TEXT[] DEFAULT '{}';
  `;

  const alterProjectsQuery = `
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS closure_reason TEXT,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
  `;

  const alterUsersQuery = `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS story_archetypes TEXT[] DEFAULT '{}';
  `;

  const alterSkillsQuery = `
    ALTER TABLE skills
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `;

  const alterStorySummariesQuery = `
    ALTER TABLE story_summaries
    ADD COLUMN IF NOT EXISTS week_start_date DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- Add unique constraint if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'story_summaries_user_id_week_start_date_summary_type_key') THEN
        ALTER TABLE story_summaries ADD CONSTRAINT story_summaries_user_id_week_start_date_summary_type_key UNIQUE (user_id, week_start_date, summary_type);
      END IF;
    END
    $$;
  `;

  const alterImpactNodesQuery = `
    ALTER TABLE impact_nodes
    ADD COLUMN IF NOT EXISTS impact_weight INTEGER;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impact_nodes_impact_weight_check') THEN
        ALTER TABLE impact_nodes ADD CONSTRAINT impact_nodes_impact_weight_check CHECK (impact_weight IS NULL OR (impact_weight >= 0 AND impact_weight <= 100));
      END IF;
    END
    $$;
  `;

  const alterNeedsQuery = `
    ALTER TABLE needs
    ADD COLUMN IF NOT EXISTS urgency_level TEXT CHECK (urgency_level IN ('low','medium','high','critical')),
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB,
    ADD COLUMN IF NOT EXISTS location JSONB,
    ADD COLUMN IF NOT EXISTS mobility_required BOOLEAN DEFAULT FALSE;
  `;

  const alterResourcesQuery = `
    ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ADD COLUMN IF NOT EXISTS availability_schedule JSONB,
    ADD COLUMN IF NOT EXISTS conditions TEXT;
  `;

  try {
    await pool.query(alterTasksQuery);
    await pool.query(alterSkillsQuery);
    await pool.query(alterProjectsQuery);
    await pool.query(alterUsersQuery);
    await pool.query(alterStorySummariesQuery);
    await pool.query(alterImpactNodesQuery);

    // Add Discord columns to needs table
    await pool.query(`
      ALTER TABLE needs
      ADD COLUMN IF NOT EXISTS discord_message_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS discord_thread_id VARCHAR(50)
    `);

    console.log('PostgreSQL: Existing tables (tasks, projects, users, needs) altered with new fields.');
  } catch (err) {
    console.error('PostgreSQL: Error altering existing tables:', err);
  }
};

export { alterExistingTables };
