const pool = require('../../backend/db.js');

const createUserBadgesTable = async () => {
  const userBadgesTableQuery = `
    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_ids INTEGER[] DEFAULT '{}', -- Array of badge IDs earned by the user
      last_awarded_at TIMESTAMP WITH TIME ZONE NULL, -- Timestamp of when the latest badge was awarded or row updated
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      IF TG_OP = 'INSERT' OR NEW.badge_ids <> OLD.badge_ids THEN
        NEW.last_awarded_at = NOW(); -- Update last_awarded_at if badges change or on new row
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_user_badges_updated_at
    BEFORE INSERT OR UPDATE ON user_badges
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_user_badges_badge_ids ON user_badges USING GIN(badge_ids);
  `;

  try {
    await pool.query(userBadgesTableQuery);
    console.log('PostgreSQL: User_badges table created or already exists.');

    // Attempt to create trigger function and trigger
    try {
        await pool.query(triggerQuery);
        console.log('PostgreSQL: Trigger set_user_badges_updated_at created for user_badges table.');
    } catch (triggerErr) {
        if (triggerErr.code === '42723' && triggerErr.message.includes('trigger_set_timestamp')) { // function already exists
            console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, attempting to create trigger only.');
            const createTriggerOnlyQuery = `
              CREATE TRIGGER set_user_badges_updated_at
              BEFORE INSERT OR UPDATE ON user_badges
              FOR EACH ROW
              EXECUTE FUNCTION trigger_set_timestamp();
            `;
            const checkTriggerExistsQuery = `
              SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_badges_updated_at' AND tgrelid = 'user_badges'::regclass;
            `;
            const triggerExistsResult = await pool.query(checkTriggerExistsQuery);
            if (triggerExistsResult.rowCount === 0) {
              await pool.query(createTriggerOnlyQuery);
              console.log('PostgreSQL: Trigger set_user_badges_updated_at created for user_badges table (function previously existed).');
            } else {
              console.log('PostgreSQL: Trigger set_user_badges_updated_at already exists for user_badges table.');
            }
        } else if (triggerErr.code === '42710' && triggerErr.message.includes('trigger "set_user_badges_updated_at" for relation "user_badges" already exists')) {
             console.log('PostgreSQL: Trigger set_user_badges_updated_at already exists for user_badges table.');
        } else {
            // Re-throw other trigger errors
            throw triggerErr;
        }
    }

    await pool.query(indexesQuery);
    console.log('PostgreSQL: Gin index on user_badges(badge_ids) created or ensured.');

  } catch (err) {
    console.error('PostgreSQL: Error creating user_badges table, trigger or index:', err);
  }
};

module.exports = {
  createUserBadgesTable,
};
