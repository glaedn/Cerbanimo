import pool from '../backend/db.js';

const createImpactTables = async () => {
  const outcomesTableQuery = `
    CREATE TABLE IF NOT EXISTS outcomes (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      statement TEXT NOT NULL, -- Plain-language statement of intended real-world effect
      status VARCHAR(50) DEFAULT 'intended', -- 'intended', 'achieved', 'not_achieved', 'superseded'
      resolution_statement TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const impactNodesTableQuery = `
    CREATE TABLE IF NOT EXISTS impact_nodes (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL, -- 'task', 'project', 'outcome', 'real-world-effect'
      entity_id INTEGER, -- ID of the related task, project, or outcome
      label TEXT,
      description TEXT,
      impact_weight INTEGER CHECK (impact_weight IS NULL OR (impact_weight >= 0 AND impact_weight <= 100)),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const impactEdgesTableQuery = `
    CREATE TABLE IF NOT EXISTS impact_edges (
      id SERIAL PRIMARY KEY,
      from_node_id INTEGER REFERENCES impact_nodes(id) ON DELETE CASCADE,
      to_node_id INTEGER REFERENCES impact_nodes(id) ON DELETE CASCADE,
      relation_type VARCHAR(50), -- e.g., 'contributes_to', 'results_in'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(outcomesTableQuery);
    await pool.query(impactNodesTableQuery);
    await pool.query(impactEdgesTableQuery);
    console.log('PostgreSQL: Impact tables (outcomes, nodes, edges) created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating impact tables:', err);
  }
};

export { createImpactTables };
