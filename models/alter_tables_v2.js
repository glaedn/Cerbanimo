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
    ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT TRUE;
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
    ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS public_good_score NUMERIC DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS public_good_scored_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS public_good_source VARCHAR(20) DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS token_escrow NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS escrow_funded_by_creator BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS service_price INTEGER,
    ADD COLUMN IF NOT EXISTS service_visibility TEXT[] DEFAULT '{}';
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
    ADD COLUMN IF NOT EXISTS skills JSONB,
    ADD COLUMN IF NOT EXISTS interests JSONB,
    ADD COLUMN IF NOT EXISTS story_archetypes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"user"}'::text[],
    ADD COLUMN IF NOT EXISTS alpha BOOLEAN DEFAULT FALSE,
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
    ADD COLUMN IF NOT EXISTS trust_level NUMERIC(12, 4) DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS onboarding_stage text DEFAULT 'orientation',
    ADD COLUMN IF NOT EXISTS role_weights jsonb DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS mentorship_status jsonb DEFAULT '{"is_mentor": false, "mentees": []}',
    ADD COLUMN IF NOT EXISTS adaptive_preferences jsonb DEFAULT '{"density": "standard", "theme_accent": "default"}',
    ADD COLUMN IF NOT EXISTS totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trust_bootstrap_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total_decayed NUMERIC(36, 18) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS resume_text TEXT,
    ADD COLUMN IF NOT EXISTS last_resume_analysis_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS focus_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    DO $$
    DECLARE
      skills_type TEXT;
      interests_type TEXT;
    BEGIN
      SELECT udt_name INTO skills_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'skills';

      IF skills_type IN ('_text', '_jsonb') THEN
        ALTER TABLE users
        ALTER COLUMN skills DROP DEFAULT;

        ALTER TABLE users
        ALTER COLUMN skills TYPE JSONB
        USING CASE WHEN skills IS NULL THEN NULL ELSE to_jsonb(skills) END;
      END IF;

      ALTER TABLE users
      ALTER COLUMN skills SET DEFAULT '[]'::jsonb;

      SELECT udt_name INTO interests_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'interests';

      IF interests_type IN ('_text', '_jsonb') THEN
        ALTER TABLE users
        ALTER COLUMN interests DROP DEFAULT;

        ALTER TABLE users
        ALTER COLUMN interests TYPE JSONB
        USING CASE WHEN interests IS NULL THEN NULL ELSE to_jsonb(interests) END;
      END IF;

      ALTER TABLE users
      ALTER COLUMN interests SET DEFAULT '[]'::jsonb;
    END
    $$;
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
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 0.94;
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
    ADD COLUMN IF NOT EXISTS price NUMERIC,
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
      ALTER COLUMN cotokens TYPE NUMERIC(36,18),
      ALTER COLUMN trust_level TYPE NUMERIC(12, 4);

      ALTER TABLE token_transactions
      ALTER COLUMN amount TYPE NUMERIC(36,18),
      ADD COLUMN IF NOT EXISTS tx_hash TEXT,
      ADD COLUMN IF NOT EXISTS chain TEXT,
      ADD COLUMN IF NOT EXISTS on_chain_status VARCHAR(50);

      ALTER TABLE community_treasury
      ADD COLUMN IF NOT EXISTS total_burned NUMERIC(36,18) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_decayed NUMERIC(36,18) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_decay_run_at TIMESTAMP;

      CREATE TABLE IF NOT EXISTS token_burns (
        id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(64), -- 'marketplace_service_purchase', 'need_fulfillment', 'resource_exchange'
        transaction_id INTEGER,
        burned_amount NUMERIC(36,18),
        burned_from VARCHAR(20), -- 'user', 'community'
        entity_id INTEGER, -- user_id or community_id
        community_id INTEGER REFERENCES communities(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_token_burns_community_date ON token_burns(community_id, created_at);
    `);

    await pool.query(alterStorySummariesQuery);
    await pool.query(alterImpactNodesQuery);
    await pool.query(alterNeedsQuery);
    await pool.query(alterResourcesQuery);

    await pool.query(`
      ALTER TABLE workflow_runs
      ADD COLUMN IF NOT EXISTS action_id BIGINT,
      ADD COLUMN IF NOT EXISTS actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS source_client TEXT,
      ADD COLUMN IF NOT EXISTS related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error JSONB,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS claim_token TEXT,
      ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

      ALTER TABLE workflow_runs ALTER COLUMN action_id TYPE BIGINT USING action_id::bigint;

      ALTER TABLE workflow_steps
      ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS result JSONB,
      ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

      DELETE FROM workflow_steps a
      USING workflow_steps b
      WHERE a.workflow_run_id = b.workflow_run_id
        AND a.step_name = b.step_name
        AND (
          CASE a.status
            WHEN 'completed' THEN 6 WHEN 'failed' THEN 5 WHEN 'running' THEN 4
            WHEN 'skipped' THEN 3 WHEN 'cancelled' THEN 2 ELSE 1
          END,
          a.created_at,
          a.id::text
        ) < (
          CASE b.status
            WHEN 'completed' THEN 6 WHEN 'failed' THEN 5 WHEN 'running' THEN 4
            WHEN 'skipped' THEN 3 WHEN 'cancelled' THEN 2 ELSE 1
          END,
          b.created_at,
          b.id::text
        );

      CREATE INDEX IF NOT EXISTS idx_workflow_runs_action_id ON workflow_runs(action_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_actor_user_id ON workflow_runs(actor_user_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_related_project_id ON workflow_runs(related_project_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_runs_type_status ON workflow_runs(workflow_type, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_runs_one_per_action_type
      ON workflow_runs(action_id, workflow_type)
      WHERE action_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_name ON workflow_steps(workflow_run_id, step_name);
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_run_status ON workflow_steps(workflow_run_id, status);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_steps_unique_run_step
      ON workflow_steps(workflow_run_id, step_name);

      DO $$
      BEGIN
        IF to_regclass('public.api_actions') IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_runs_action_id_fkey') THEN
          ALTER TABLE workflow_runs
          ADD CONSTRAINT workflow_runs_action_id_fkey
          FOREIGN KEY (action_id) REFERENCES api_actions(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS potential_users (
        discord_user_id VARCHAR(50) PRIMARY KEY,
        discord_username VARCHAR(100),
        accumulated_tokens JSONB DEFAULT '[]'::jsonb,
        action_history JSONB DEFAULT '[]'::jsonb,
        community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
        first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_history (
        id SERIAL PRIMARY KEY,
        validator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subject_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100),
        weight_applied NUMERIC DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_validation_history_validator_subject
      ON validation_history(validator_id, subject_id);
    `);

    await pool.query(`
      ALTER TABLE verification_events
      ADD COLUMN IF NOT EXISTS challenge_window_expires_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS challenged_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS challenger_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS challenge_stake NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS secondary_review_status VARCHAR(50)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_vesting (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        vested_tokens NUMERIC DEFAULT 0,
        vesting_unlocks_at TIMESTAMP WITH TIME ZONE NOT NULL,
        vesting_revoked BOOLEAN DEFAULT FALSE,
        released BOOLEAN DEFAULT FALSE,
        released_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_token_vesting_unlocks
      ON token_vesting(vesting_unlocks_at)
      WHERE vesting_revoked = FALSE AND released_at IS NULL;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_queue (
        id SERIAL PRIMARY KEY,
        verification_id INTEGER REFERENCES verification_events(id) ON DELETE CASCADE,
        triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        outcome VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_queue_status
      ON audit_queue(status, triggered_at);
    `);

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
      CREATE TABLE IF NOT EXISTS ai_token_usage (
        id SERIAL PRIMARY KEY,
        model VARCHAR(80) NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        usage_type VARCHAR(40), -- 'analysis', 'recommendation'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON ai_token_usage(created_at);

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
