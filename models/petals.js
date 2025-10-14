import pool from '../backend/db.js';

export const createPetalTable = async () => {
  const petalTableQuery = `
    CREATE TABLE IF NOT EXISTS petals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
      skill_level INTEGER DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'Seeded',
      assigned_user_ids INTEGER[] DEFAULT '{}',
      reward_tokens INTEGER DEFAULT 10,
      dependencies INTEGER[] DEFAULT '{}', -- Stores IDs of petals that must be completed before this one
      submitted BOOLEAN DEFAULT FALSE,
      submitted_at TIMESTAMP WITH TIME ZONE,
      submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      proof_of_work_links TEXT[] DEFAULT '{}',
      reflection TEXT, -- User's reflection upon completing the petal
      reviewer_ids INTEGER[] DEFAULT '{}', -- IDs of users assigned to review the petal
      approvals INTEGER[] DEFAULT '{}', -- IDs of users who approved the petal completion
      rejections INTEGER[] DEFAULT '{}', -- IDs of users who rejected the petal completion
      peer_review_deadline TIMESTAMP WITH TIME ZONE,
      pm_approval_deadline TIMESTAMP WITH TIME ZONE,
      petal_type VARCHAR(50) DEFAULT 'project_petal', -- e.g., project_petal, resource_management, community_engagement
      related_resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, -- Link to a specific resource if petal is resource-related
      related_need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL, -- Link to a specific need if petal is need-related
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_petal_updated_at
    BEFORE UPDATE ON petals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_petals_project_id ON petals(project_id);
    CREATE INDEX IF NOT EXISTS idx_petals_creator_id ON petals(creator_id);
    CREATE INDEX IF NOT EXISTS idx_petals_skill_id ON petals(skill_id);
    CREATE INDEX IF NOT EXISTS idx_petals_status ON petals(status);
    CREATE INDEX IF NOT EXISTS idx_petals_assigned_user_ids ON petals USING GIN(assigned_user_ids);
    CREATE INDEX IF NOT EXISTS idx_petals_dependencies ON petals USING GIN(dependencies);
    CREATE INDEX IF NOT EXISTS idx_petals_petal_type ON petals(petal_type);
  `;

  try {
    await pool.query(petalTableQuery);
    console.log('PostgreSQL: Petals table created or already exists.');

    // Attempt to create trigger function and trigger
    // Wrap in a try-catch for the trigger part to handle cases where the function might already exist
    try {
        await pool.query(triggerQuery);
        console.log('PostgreSQL: Trigger set_petal_updated_at created for petals table.');
    } catch (triggerErr) {
        if (triggerErr.code === '42723' && triggerErr.message.includes('trigger_set_timestamp')) { // function already exists
            console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, attempting to create trigger only.');
            const createTriggerOnlyQuery = `
              CREATE TRIGGER set_petal_updated_at
              BEFORE UPDATE ON petals
              FOR EACH ROW
              EXECUTE FUNCTION trigger_set_timestamp();
            `;
            // Check if trigger already exists before attempting to create it
            const checkTriggerExistsQuery = `
              SELECT 1 FROM pg_trigger WHERE tgname = 'set_petal_updated_at' AND tgrelid = 'petals'::regclass;
            `;
            const triggerExistsResult = await pool.query(checkTriggerExistsQuery);
            if (triggerExistsResult.rowCount === 0) {
              await pool.query(createTriggerOnlyQuery);
              console.log('PostgreSQL: Trigger set_petal_updated_at created for petals table (function previously existed).');
            } else {
              console.log('PostgreSQL: Trigger set_petal_updated_at already exists for petals table.');
            }
        } else if (triggerErr.code === '42710' && triggerErr.message.includes('trigger "set_petal_updated_at" for relation "petals" already exists')) {
             console.log('PostgreSQL: Trigger set_petal_updated_at already exists for petals table.');
        } else {
            // Re-throw other trigger errors
            throw triggerErr;
        }
    }

    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on petals table created or ensured.');

  } catch (err) {
    console.error('PostgreSQL: Error processing petals table or related entities:', err);
  }
};

