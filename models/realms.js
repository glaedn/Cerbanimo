const pool = require('../backend/db.js'); // Assuming shared pool

const createRealmsTable = async () => {
    const realmTableQuery = `
      CREATE TABLE IF NOT EXISTS realms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members INTEGER[] DEFAULT '{}', -- Array of user IDs, FK to users.id
        interest_tags INTEGER[] DEFAULT '{}', -- Array of interest IDs, FK to interests.id
        proposals INTEGER[] DEFAULT '{}', -- Array of intention IDs, FK to intentions.id
        approved_intentions INTEGER[] DEFAULT '{}', -- Array of intention IDs, FK to intentions.id
        vote_delegations JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const triggerQuery = `
      CREATE OR REPLACE FUNCTION trigger_set_realm_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_realm_updated_at' AND tgrelid = 'realms'::regclass) THEN
          CREATE TRIGGER set_realm_updated_at
          BEFORE UPDATE ON realms
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_realm_timestamp();
        END IF;
      END
      $$;
    `;

    try {
      await pool.query(realmTableQuery);
      console.log('PostgreSQL: Realms table created or already exists.');
      await pool.query(triggerQuery);
      console.log('PostgreSQL: Realms updated_at trigger created or already exists.');
    } catch (err) {
      console.error('PostgreSQL: Error creating realms table or trigger:', err);
    }
  };
  

module.exports = {
  createRealmsTable, // PostgreSQL
};