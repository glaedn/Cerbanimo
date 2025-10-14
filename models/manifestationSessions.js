import pool from '../backend/db.js';

export const createManifestationSessionsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS manifestation_sessions (
      id SERIAL PRIMARY KEY,
      intention_id INTEGER NOT NULL REFERENCES intentions(id) ON DELETE CASCADE,
      realm_id INTEGER REFERENCES realms(id) ON DELETE SET NULL,
      start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP WITH TIME ZONE,
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'aborted'
      participants INTEGER[] DEFAULT '{}',
      resonance_events JSONB[] DEFAULT '[]',
      events JSONB[] DEFAULT '[]',
      manifestation_summary TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_manifestation_session_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_manifestation_session_updated_at') THEN
        CREATE TRIGGER set_manifestation_session_updated_at
        BEFORE UPDATE ON manifestation_sessions
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_manifestation_session_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_manifestation_sessions_intention_id ON manifestation_sessions(intention_id);
    CREATE INDEX IF NOT EXISTS idx_manifestation_sessions_realm_id ON manifestation_sessions(realm_id);
    CREATE INDEX IF NOT EXISTS idx_manifestation_sessions_status ON manifestation_sessions(status);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Manifestation_sessions table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Manifestation_sessions updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on manifestation_sessions table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating manifestation_sessions table, trigger, or indexes:', err);
  }
};