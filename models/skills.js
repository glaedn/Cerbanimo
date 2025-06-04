const pool = require('../../backend/db.js'); // Assuming models are in models/ and db.js is in backend/

const createSkillsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100),
      description TEXT,
      unlocked_users JSONB DEFAULT '[]'::jsonb, -- Stores array of objects: [{user_id, exp, level, unlocked_at}]
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_skill_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_skill_updated_at') THEN
        CREATE TRIGGER set_skill_updated_at
        BEFORE UPDATE ON skills
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_skill_timestamp();
      END IF;
    END
    $$;
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Skills table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Skills updated_at trigger created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating skills table or trigger:', err);
    // Optionally rethrow or handle error appropriately
  }
};

module.exports = {
  createSkillsTable,
};
