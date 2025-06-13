const pool = require('../backend/db.js'); // Adjusted path

// User schema with tasks relationship
const createUserTable = async () => {
  const userTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      auth0_id TEXT UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      profile_picture TEXT,
      bio TEXT,
      skills JSONB,
      interests JSONB,
      badges JSONB,
      cotokens NUMERIC DEFAULT 0,
      experience JSONB DEFAULT '[]'::jsonb,
      token_ledger JSONB DEFAULT '[]'::jsonb,
      roles TEXT[] DEFAULT '{"user"}'::text[],
      contact_links TEXT[] DEFAULT '{}'::TEXT[],
      alpha BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_user_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_updated_at' AND tgrelid = 'users'::regclass) THEN
        CREATE TRIGGER set_user_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_user_timestamp();
      END IF;
    END
    $$;
  `;

  try {
    await pool.query(userTableQuery);
    console.log('PostgreSQL: Users table created or already exists.'); // Separated log
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Users updated_at trigger created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating users table or trigger:', err); // Unified error message
  }
};

module.exports = {
  createUserTable, // PostgreSQL
};
