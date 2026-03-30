const pool = require('../backend/db.js');

const createStoryTables = async () => {
  const storyUnitsTableQuery = `
    CREATE TABLE IF NOT EXISTS story_units (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      skill_tags TEXT[] DEFAULT '{}',
      role VARCHAR(100), -- 'implementer', 'reviewer', etc.
      complexity NUMERIC, -- 0-1
      impact_weight NUMERIC, -- 0-1
      collaboration_count INTEGER DEFAULT 0,
      dependencies_unblocked INTEGER DEFAULT 0,
      task_type VARCHAR(100),
      completion_time INTERVAL, -- calculated from accepted_at to completed_at
      revision_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const userPatternsTableQuery = `
    CREATE TABLE IF NOT EXISTS user_patterns (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      pattern VARCHAR(100), -- 'Finisher', 'Starter', 'Reviver', 'Specialist', 'Connector', 'Verifier'
      strength NUMERIC DEFAULT 0, -- 0-1
      historical_active BOOLEAN DEFAULT TRUE,
      detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const storySummariesTableQuery = `
    CREATE TABLE IF NOT EXISTS story_summaries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      summary_type VARCHAR(50), -- 'micro', 'pattern', 'portfolio'
      content TEXT, -- LLM generated narrative
      structured_data JSONB, -- The source units/patterns
      is_cached BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const impactSummariesTableQuery = `
    CREATE TABLE IF NOT EXISTS impact_summaries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      outcome_area VARCHAR(255),
      constellation_count INTEGER DEFAULT 0,
      project_count INTEGER DEFAULT 0,
      dominant_pattern VARCHAR(100),
      content TEXT, -- LLM generated
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(storyUnitsTableQuery);
    await pool.query(userPatternsTableQuery);
    await pool.query(storySummariesTableQuery);
    await pool.query(impactSummariesTableQuery);
    console.log('PostgreSQL: Story and Pattern tables created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating story tables:', err);
  }
};

module.exports = { createStoryTables };
