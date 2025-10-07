const pool = require('../backend/db.js'); // Adjust path as necessary

const createChroniclesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS chronicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
      intention_id INTEGER REFERENCES intentions(id) ON DELETE SET NULL,
      realm_id INTEGER REFERENCES realms(id) ON DELETE SET NULL,
      title VARCHAR(255),
      content_type VARCHAR(50) DEFAULT 'text',
      reflection TEXT,
      media_urls TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'published',
      upvotes INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, story_node_id) -- Assuming a user's chronicle is unique per story node
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_chronicle_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_chronicle_updated_at') THEN
        CREATE TRIGGER set_chronicle_updated_at
        BEFORE UPDATE ON chronicles
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_chronicle_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_chronicles_user_id ON chronicles(user_id);
    CREATE INDEX IF NOT EXISTS idx_chronicles_story_node_id ON chronicles(story_node_id);
    CREATE INDEX IF NOT EXISTS idx_chronicles_intention_id ON chronicles(intention_id);
    CREATE INDEX IF NOT EXISTS idx_chronicles_realm_id ON chronicles(realm_id);
    CREATE INDEX IF NOT EXISTS idx_chronicles_tags ON chronicles USING GIN(tags);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Chronicles table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Chronicles updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on chronicles table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating chronicles table, trigger, or indexes:', err);
  }
};

module.exports = {
  createChroniclesTable,
};