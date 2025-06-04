const pool = require('../../backend/db.js'); // Adjusted path

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

    CREATE TRIGGER set_user_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  try {
    await pool.query(userTableQuery);
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Users table created or already exists, and trigger set_user_updated_at created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating tables or trigger:', err);
  }
};

module.exports = {
  createUserTable, // PostgreSQL
};
