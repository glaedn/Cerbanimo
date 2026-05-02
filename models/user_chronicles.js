const pool = require('../backend/db.js'); // Adjust path as necessary

const createUserChroniclesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS user_chronicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
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
    CREATE OR REPLACE FUNCTION trigger_set_user_chronicle_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_chronicle_updated_at') THEN
        CREATE TRIGGER set_user_chronicle_updated_at
        BEFORE UPDATE ON user_chronicles
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_user_chronicle_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_user_chronicles_user_id ON user_chronicles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_chronicles_story_node_id ON user_chronicles(story_node_id);
    CREATE INDEX IF NOT EXISTS idx_user_chronicles_project_id ON user_chronicles(project_id);
    CREATE INDEX IF NOT EXISTS idx_user_chronicles_community_id ON user_chronicles(community_id);
    CREATE INDEX IF NOT EXISTS idx_user_chronicles_tags ON user_chronicles USING GIN(tags);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: user_chronicles table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: user_chronicles updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on user_chronicles table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating user_chronicles table, trigger, or indexes:', err);
    // If the error is due to referencing non-existent tables (users, story_nodes, projects, communities)
    // this will need to be addressed by ensuring those tables are created first.
    // For this task, we assume they exist based on other model files.
  }
};

module.exports = {
  createUserChroniclesTable,
};
