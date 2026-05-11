import pool from '../backend/db.js';

const createNarrativeTables = async () => {
  const mentorshipRelationsTableQuery = `
    CREATE TABLE IF NOT EXISTS mentorship_relations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mentor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mentee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
      story_node_id UUID REFERENCES story_nodes(id) ON DELETE SET NULL,
      context TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const contextualTrustTableQuery = `
    CREATE TABLE IF NOT EXISTS contextual_trust (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      truster_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      trustee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      domain_id INTEGER REFERENCES skills(id) ON DELETE SET NULL, -- Trust can be tied to a skill domain
      score NUMERIC DEFAULT 0, -- -1 to 1 or 0-100
      signals JSONB DEFAULT '[]'::jsonb, -- References to story nodes or endorsements
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const impactPropagationTableQuery = `
    CREATE TABLE IF NOT EXISTS impact_propagation (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      root_story_node_id UUID REFERENCES story_nodes(id) ON DELETE CASCADE,
      target_entity_id UUID, -- Can be another story node, project, or need
      target_entity_type VARCHAR(50), -- 'story_node', 'project', 'need'
      propagation_type VARCHAR(50), -- 'enables', 'stabilizes', 'reduces_burnout'
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(mentorshipRelationsTableQuery);
    await pool.query(contextualTrustTableQuery);
    await pool.query(impactPropagationTableQuery);
    console.log('PostgreSQL: Narrative Identity (Mentorship, Trust, Propagation) tables created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating narrative tables:', err);
  }
};

export { createNarrativeTables };
