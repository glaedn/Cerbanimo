const pool = require('../backend/db.js'); // Path relative to models/ directory

const createImpactContributionsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS impact_contributions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contribution_type VARCHAR(100) NOT NULL, -- e.g., 'task_completion', 'project_creation', 'resource_donation', 'mentorship'
      related_entity_type VARCHAR(50), -- e.g., 'task', 'project', 'user' (for mentorship target)
      related_entity_id INTEGER,
      community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL, -- Optional: link impact to a community
      description TEXT,
      quantity NUMERIC, -- e.g., hours spent, items donated, tokens awarded for this specific impact
      unit VARCHAR(50), -- e.g., 'hours', 'items', 'tokens'
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_impact_contribution_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_impact_contribution_updated_at') THEN
        CREATE TRIGGER set_impact_contribution_updated_at
        BEFORE UPDATE ON impact_contributions
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_impact_contribution_timestamp();
      END IF;
    END
    $$;
  `;
  // Indexes for faster querying
  const userIndexQuery = `CREATE INDEX IF NOT EXISTS idx_impact_contributions_user_id ON impact_contributions(user_id);`;
  const typeIndexQuery = `CREATE INDEX IF NOT EXISTS idx_impact_contributions_type ON impact_contributions(contribution_type);`;
  const entityIndexQuery = `CREATE INDEX IF NOT EXISTS idx_impact_contributions_entity ON impact_contributions(related_entity_type, related_entity_id);`;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Impact_Contributions table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Impact_Contributions updated_at trigger created or already exists.');
    await pool.query(userIndexQuery);
    console.log('PostgreSQL: Index on impact_contributions.user_id created or already exists.');
    await pool.query(typeIndexQuery);
    console.log('PostgreSQL: Index on impact_contributions.contribution_type created or already exists.');
    await pool.query(entityIndexQuery);
    console.log('PostgreSQL: Index on impact_contributions.related_entity created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating impact_contributions table, trigger, or indexes:', err);
  }
};

module.exports = {
  createImpactContributionsTable,
};
