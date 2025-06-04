const pool = require('../../backend/db.js');

const createInterestsTable = async () => {
  const interestsTableQuery = `
    CREATE TABLE IF NOT EXISTS interests (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT NULL,
      category VARCHAR(100) NULL,
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

    CREATE TRIGGER set_interests_updated_at
    BEFORE UPDATE ON interests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  try {
    await pool.query(interestsTableQuery);
    console.log('PostgreSQL: Interests table created or already exists.');

    // Attempt to create trigger function and trigger
    try {
        await pool.query(triggerQuery);
        console.log('PostgreSQL: Trigger set_interests_updated_at created for interests table.');
    } catch (triggerErr) {
        if (triggerErr.code === '42723' && triggerErr.message.includes('trigger_set_timestamp')) { // function already exists
            console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, attempting to create trigger only.');
            const createTriggerOnlyQuery = `
              CREATE TRIGGER set_interests_updated_at
              BEFORE UPDATE ON interests
              FOR EACH ROW
              EXECUTE FUNCTION trigger_set_timestamp();
            `;
            // Check if trigger already exists before attempting to create it
            const checkTriggerExistsQuery = `
              SELECT 1 FROM pg_trigger WHERE tgname = 'set_interests_updated_at' AND tgrelid = 'interests'::regclass;
            `;
            const triggerExistsResult = await pool.query(checkTriggerExistsQuery);
            if (triggerExistsResult.rowCount === 0) {
              await pool.query(createTriggerOnlyQuery);
              console.log('PostgreSQL: Trigger set_interests_updated_at created for interests table (function previously existed).');
            } else {
              console.log('PostgreSQL: Trigger set_interests_updated_at already exists for interests table.');
            }
        } else if (triggerErr.code === '42710' && triggerErr.message.includes('trigger "set_interests_updated_at" for relation "interests" already exists')) {
             console.log('PostgreSQL: Trigger set_interests_updated_at already exists for interests table.');
        } else {
            // Re-throw other trigger errors
            throw triggerErr;
        }
    }
  } catch (err) {
    console.error('PostgreSQL: Error creating interests table or trigger:', err);
  }
};

module.exports = {
  createInterestsTable,
};
