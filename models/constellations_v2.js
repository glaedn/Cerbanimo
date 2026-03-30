const pool = require('../backend/db.js');

const createConstellationTables = async () => {
  const constellationsTableQuery = `
    CREATE TABLE IF NOT EXISTS constellations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      shared_objective TEXT NOT NULL,
      outcome_id INTEGER REFERENCES outcomes(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'forming', -- 'forming', 'active', 'winding down', 'completed', 'dissolved'
      health_score NUMERIC DEFAULT 0,
      velocity NUMERIC DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      dissolved_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const constellationMembersTableQuery = `
    CREATE TABLE IF NOT EXISTS constellation_members (
      id SERIAL PRIMARY KEY,
      constellation_id INTEGER REFERENCES constellations(id) ON DELETE CASCADE,
      entity_type VARCHAR(50), -- 'project', 'guild', 'community'
      entity_id INTEGER,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const constellationTasksTableQuery = `
    CREATE TABLE IF NOT EXISTS constellation_tasks (
      id SERIAL PRIMARY KEY,
      constellation_id INTEGER REFERENCES constellations(id) ON DELETE CASCADE,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const constellationPledgesTableQuery = `
    CREATE TABLE IF NOT EXISTS constellation_pledges (
      id SERIAL PRIMARY KEY,
      constellation_id INTEGER REFERENCES constellations(id) ON DELETE CASCADE,
      pledger_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL, -- Link to pledged resource
      pledge_type VARCHAR(50), -- 'contributor', 'resource'
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'withdrawn'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const contributionSplitsTableQuery = `
    CREATE TABLE IF NOT EXISTS contribution_splits (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      constellation_id INTEGER REFERENCES constellations(id) ON DELETE CASCADE,
      splits JSONB, -- { entity_id: percentage }
      proposer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'confirmed', 'contested'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const objectiveAmendmentsTableQuery = `
    CREATE TABLE IF NOT EXISTS objective_amendments (
      id SERIAL PRIMARY KEY,
      constellation_id INTEGER REFERENCES constellations(id) ON DELETE CASCADE,
      proposer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      old_objective TEXT,
      new_objective TEXT,
      votes_rcv JSONB, -- Ranked choice votes data
      status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'passed', 'failed'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(constellationsTableQuery);
    await pool.query(constellationMembersTableQuery);
    await pool.query(constellationTasksTableQuery);
    await pool.query(constellationPledgesTableQuery);
    await pool.query(contributionSplitsTableQuery);
    await pool.query(objectiveAmendmentsTableQuery);
    console.log('PostgreSQL: Constellation tables created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating constellation tables:', err);
  }
};

module.exports = { createConstellationTables };
