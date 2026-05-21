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

const alterExistingTables = async () => {
  const hasPostGIS = await checkPostGIS();

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
    ADD COLUMN IF NOT EXISTS resource_requirements TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT FALSE;
  `;

  const alterProjectsQuery = `
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS closure_reason TEXT,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS location JSONB,
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS is_expanded BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS project_plan TEXT,
    ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT FALSE;
  `;

  const alterCommunitiesQuery = `
    ALTER TABLE communities
    ADD COLUMN IF NOT EXISTS cross_community_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS discord_guild_id VARCHAR(50),
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS region VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS formatted_address TEXT,
    ADD COLUMN IF NOT EXISTS service_radius NUMERIC, -- in meters
    ADD COLUMN IF NOT EXISTS governance_config JSONB DEFAULT '{
      "votingModel": "direct",
      "proposalThreshold": 1,
      "quorum": 0.1,
      "delegationEnabled": true,
      "emergencyPowers": false,
      "constitutionalAmendmentThreshold": 0.66
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS active_constitution_id INTEGER;
  `;

  const alterUsersQuery = `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS story_archetypes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS capacity_status TEXT DEFAULT 'active' CHECK (capacity_status IN ('active', 'limited', 'unavailable')),
    ADD COLUMN IF NOT EXISTS discord_user_id VARCHAR(50),
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS region VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS formatted_address TEXT,
    ADD COLUMN IF NOT EXISTS mobility_range NUMERIC, -- in meters
    ADD COLUMN IF NOT EXISTS emergency_response_capable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS share_location_publicly BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS participation_modes jsonb DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS trust_level int DEFAULT 1,
    ADD COLUMN IF NOT EXISTS onboarding_stage text DEFAULT 'orientation',
    ADD COLUMN IF NOT EXISTS role_weights jsonb DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mentorship_status jsonb DEFAULT '{"is_mentor": false, "mentees": []}',
    ADD COLUMN IF NOT EXISTS adaptive_preferences jsonb DEFAULT '{"density": "standard", "theme_accent": "default"}';
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
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS urgency_radius NUMERIC, -- in meters
    ADD COLUMN IF NOT EXISTS mobility_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pickup_location JSONB,
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS pickup_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS dropoff_location JSONB,
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS dropoff_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS time_slots JSONB,
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web',
    ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS fulfilled_via VARCHAR(20),
    ADD COLUMN IF NOT EXISTS complexity_score FLOAT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_expanded BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS linked_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS compensation_model VARCHAR(50) DEFAULT 'volunteer',
    ADD COLUMN IF NOT EXISTS trust_requirements TEXT,
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public';
  `;

  const alterResourcesQuery = `
    ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ${hasPostGIS ? 'ADD COLUMN IF NOT EXISTS location_point GEOGRAPHY(Point, 4326),' : ''}
    ADD COLUMN IF NOT EXISTS latitude NUMERIC,
    ADD COLUMN IF NOT EXISTS longitude NUMERIC,
    ADD COLUMN IF NOT EXISTS availability_radius NUMERIC, -- in meters
    ADD COLUMN IF NOT EXISTS availability_schedule JSONB,
    ADD COLUMN IF NOT EXISTS conditions TEXT,
    ADD COLUMN IF NOT EXISTS inventory_tracking BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'web',
    ADD COLUMN IF NOT EXISTS discord_message_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS discord_thread_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS compensation_model VARCHAR(50) DEFAULT 'shared',
    ADD COLUMN IF NOT EXISTS trust_requirements TEXT,
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public';
  `;

  try {
    await pool.query(alterTasksQuery);
    await pool.query(alterSkillsQuery);
    await pool.query(alterProjectsQuery);
    await pool.query(alterCommunitiesQuery);
    await pool.query(alterUsersQuery);

    // Update token precision and add blockchain fields
    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN cotokens TYPE NUMERIC(36,18);

      ALTER TABLE token_transactions
      ALTER COLUMN amount TYPE NUMERIC(36,18),
      ADD COLUMN IF NOT EXISTS tx_hash TEXT,
      ADD COLUMN IF NOT EXISTS chain TEXT,
      ADD COLUMN IF NOT EXISTS on_chain_status VARCHAR(50);
    `);

    await pool.query(alterStorySummariesQuery);
    await pool.query(alterImpactNodesQuery);
    await pool.query(alterNeedsQuery);
    await pool.query(alterResourcesQuery);

    // Ensure community_discord_config has necessary columns
    await pool.query(`
      ALTER TABLE community_discord_config
      ADD COLUMN IF NOT EXISTS need_channel_id TEXT,
      ADD COLUMN IF NOT EXISTS alert_channel_id TEXT
    `);

    // Add new columns to tasks
    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS time_slots JSONB
    `);

    // Add Discord columns to needs table
    await pool.query(`
      ALTER TABLE needs
      ADD COLUMN IF NOT EXISTS discord_message_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS discord_thread_id VARCHAR(50)
    `);

    // Create mapping table for multiple Discord threads (Cross-Guild Support)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS need_discord_threads (
        id SERIAL PRIMARY KEY,
        need_id INTEGER REFERENCES needs(id) ON DELETE CASCADE,
        guild_id VARCHAR(50),
        channel_id VARCHAR(50),
        thread_id VARCHAR(50),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(need_id, thread_id)
      )
    `);

    // Backfill need_discord_threads from needs table
    await pool.query(`
      INSERT INTO need_discord_threads (need_id, thread_id, channel_id, is_primary)
      SELECT id, discord_thread_id, discord_channel_id, TRUE
      FROM needs
      WHERE discord_thread_id IS NOT NULL
      ON CONFLICT (need_id, thread_id) DO NOTHING
    `);

    console.log('PostgreSQL: Existing tables (tasks, projects, users, needs) altered and need_discord_threads created.');
  } catch (err) {
    console.error('PostgreSQL: Error altering existing tables:', err);
  }
};

export { alterExistingTables };
