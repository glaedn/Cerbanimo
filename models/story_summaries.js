import pool from '../backend/db.js';

const createStorySummariesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS story_summaries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      summary_type VARCHAR(50), -- 'micro', 'pattern', 'portfolio', 'weekly wrap-up'
      content TEXT, -- LLM generated narrative
      structured_data JSONB, -- The source units/patterns
      is_cached BOOLEAN DEFAULT TRUE,
      week_start_date DATE, -- For 'weekly wrap-up' type
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, week_start_date, summary_type)
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_story_summaries_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_story_summaries_updated_at') THEN
        CREATE TRIGGER set_story_summaries_updated_at
        BEFORE UPDATE ON story_summaries
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_story_summaries_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_story_summaries_user_id ON story_summaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_story_summaries_week_start ON story_summaries(week_start_date);
    CREATE INDEX IF NOT EXISTS idx_story_summaries_type ON story_summaries(summary_type);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: story_summaries table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: story_summaries updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on story_summaries table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating story_summaries table:', err);
  }
};

export { createStorySummariesTable };
