const pool = require('../../backend/db.js'); // Path relative to models/

const createStoryNodesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS story_nodes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      title VARCHAR(255),
      content_type VARCHAR(50) DEFAULT 'text', -- e.g., 'text', 'image_gallery', 'video_link'
      reflection TEXT,
      media_urls TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'published', -- e.g., 'draft', 'published', 'archived'
      upvotes INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_story_node_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_story_node_updated_at') THEN
        CREATE TRIGGER set_story_node_updated_at
        BEFORE UPDATE ON story_nodes
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_story_node_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_story_nodes_user_id ON story_nodes(user_id);
    CREATE INDEX IF NOT EXISTS idx_story_nodes_task_id ON story_nodes(task_id);
    CREATE INDEX IF NOT EXISTS idx_story_nodes_project_id ON story_nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_story_nodes_community_id ON story_nodes(community_id);
    CREATE INDEX IF NOT EXISTS idx_story_nodes_tags ON story_nodes USING GIN(tags);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Story_Nodes table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Story_Nodes updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on story_nodes table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating story_nodes table, trigger, or indexes:', err);
  }
};

module.exports = {
  createStoryNodesTable,
};
