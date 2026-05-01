import pool from '../backend/db.js';

const createNeedCommentsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS need_comments (
      id SERIAL PRIMARY KEY,
      need_id INTEGER NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_need_comment_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_need_comment_updated_at') THEN
        CREATE TRIGGER set_need_comment_updated_at
        BEFORE UPDATE ON need_comments
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_need_comment_timestamp();
      END IF;
    END
    $$;
  `;

  const indexQuery = `
    CREATE INDEX IF NOT EXISTS idx_need_comments_need_id ON need_comments(need_id);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: need_comments table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: need_comments updated_at trigger created or already exists.');
    await pool.query(indexQuery);
    console.log('PostgreSQL: Indexes on need_comments table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating need_comments table, trigger, or indexes:', err);
  }
};

export {
  createNeedCommentsTable,
};
