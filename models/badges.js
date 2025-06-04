const pool = require('../backend/db.js');

const createBadgesTable = async () => {
  const badgesTableQuery = `
    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL, -- Path to the badge image
      criteria_details JSONB NULL, -- Optional: For structured criteria like { type: 'task_completion', count: 5, project_id: 1 }
      category VARCHAR(100) NULL, -- Optional: e.g., 'Completion', 'Skill', 'Event', 'Community'
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

    CREATE TRIGGER set_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  try {
    await pool.query(badgesTableQuery);
    console.log('PostgreSQL: Badges table created or already exists.');

    // Attempt to create trigger function and trigger
    try {
        await pool.query(triggerQuery);
        console.log('PostgreSQL: Trigger set_badges_updated_at created for badges table.');
    } catch (triggerErr) {
        if (triggerErr.code === '42723' && triggerErr.message.includes('trigger_set_timestamp')) { // function already exists
            console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, attempting to create trigger only.');
            const createTriggerOnlyQuery = `
              CREATE TRIGGER set_badges_updated_at
              BEFORE UPDATE ON badges
              FOR EACH ROW
              EXECUTE FUNCTION trigger_set_timestamp();
            `;
            const checkTriggerExistsQuery = `
              SELECT 1 FROM pg_trigger WHERE tgname = 'set_badges_updated_at' AND tgrelid = 'badges'::regclass;
            `;
            const triggerExistsResult = await pool.query(checkTriggerExistsQuery);
            if (triggerExistsResult.rowCount === 0) {
              await pool.query(createTriggerOnlyQuery);
              console.log('PostgreSQL: Trigger set_badges_updated_at created for badges table (function previously existed).');
            } else {
              console.log('PostgreSQL: Trigger set_badges_updated_at already exists for badges table.');
            }
        } else if (triggerErr.code === '42710' && triggerErr.message.includes('trigger "set_badges_updated_at" for relation "badges" already exists')) {
             console.log('PostgreSQL: Trigger set_badges_updated_at already exists for badges table.');
        } else {
            // Re-throw other trigger errors
            throw triggerErr;
        }
    }
  } catch (err) {
    console.error('PostgreSQL: Error creating badges table or trigger:', err);
  }
};

module.exports = {
  createBadgesTable,
};
