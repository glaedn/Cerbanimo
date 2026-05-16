import pool from '../backend/db.js';

const alterStoryNodesForNarrative = async () => {
  try {
    await pool.query(`
      ALTER TABLE story_nodes
      ADD COLUMN IF NOT EXISTS story_type VARCHAR(50) DEFAULT 'operational',
      ADD COLUMN IF NOT EXISTS collaborators JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS downstream_effects TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS outcome_statement TEXT,
      ADD COLUMN IF NOT EXISTS impact_label TEXT,
      ADD COLUMN IF NOT EXISTS impact_weight NUMERIC;
    `);
    console.log('PostgreSQL: story_nodes table altered for Phase F6 Narrative Identity.');
  } catch (err) {
    console.error('PostgreSQL: Error altering story_nodes table:', err);
  }
};

export { alterStoryNodesForNarrative };
