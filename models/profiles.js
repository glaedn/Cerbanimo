const pool = require('../backend/db.js'); // Path relative to models/ directory

const createProfilesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      headline TEXT,
      social_links JSONB DEFAULT '{}'::jsonb, -- e.g., {"linkedin": "url", "github": "url"}
      location VARCHAR(255),
      website_url TEXT,
      preferred_pronouns VARCHAR(50),
      profile_visibility VARCHAR(50) DEFAULT 'public', -- e.g., 'public', 'private', 'friends_only'
      last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_profile_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profile_updated_at') THEN
        CREATE TRIGGER set_profile_updated_at
        BEFORE UPDATE ON profiles
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_profile_timestamp();
      END IF;
    END
    $$;
  `;
  // Index on user_id for faster lookups
  const indexQuery = `CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);`;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Profiles table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Profiles updated_at trigger created or already exists.');
    await pool.query(indexQuery);
    console.log('PostgreSQL: Index on profiles.user_id created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating profiles table, trigger, or index:', err);
  }
};

module.exports = {
  createProfilesTable,
};
