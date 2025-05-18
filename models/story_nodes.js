const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const createStoryNodesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS public.story_nodes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reflection TEXT NOT NULL,
      media_urls TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('PostgreSQL: story_nodes table created or already exists');
  } catch (err) {
    console.error('PostgreSQL: Error creating story_nodes table:', err);
  }
};

module.exports = { createStoryNodesTable };
