import pool from '../backend/db.js';

const createGovernanceTables = async () => {
  const constitutionsTableQuery = `
    CREATE TABLE IF NOT EXISTS constitutions (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(community_id, version)
    );
  `;

  const proposalsTableQuery = `
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      proposal_type VARCHAR(50) NOT NULL, -- 'governance', 'operational', 'resource', 'social', 'constitution'
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'deliberation', 'voting', 'passed', 'rejected', 'executed'
      payload JSONB DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const votesTableQuery = `
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote JSONB NOT NULL, -- can be BOOLEAN for simple, or JSONB for quadratic/weighted
      weight NUMERIC(12, 4) DEFAULT 1.0,
      is_delegated BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proposal_id, user_id)
    );
  `;

  const delegationsTableQuery = `
    CREATE TABLE IF NOT EXISTS delegations (
      id SERIAL PRIMARY KEY,
      delegator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delegate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain VARCHAR(50), -- e.g., 'logistics', 'treasury', 'all'
      region VARCHAR(100),
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CHECK (delegator_id <> delegate_id)
    );
  `;

  const federationTreatiesTableQuery = `
    CREATE TABLE IF NOT EXISTS federation_treaties (
      id SERIAL PRIMARY KEY,
      community_a INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      community_b INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      treaty_type VARCHAR(50) NOT NULL, -- 'mutual_aid', 'shared_mission', 'resource_sharing'
      terms JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'active', -- 'proposed', 'active', 'suspended', 'terminated'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CHECK (community_a <> community_b)
    );
  `;

  const governanceEventsTableQuery = `
    CREATE TABLE IF NOT EXISTS governance_events (
      id BIGSERIAL PRIMARY KEY,
      community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_governance_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_proposal_updated_at') THEN
        CREATE TRIGGER set_proposal_updated_at
        BEFORE UPDATE ON proposals
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_governance_timestamp();
      END IF;
    END
    $$;
  `;

  try {
    await pool.query(constitutionsTableQuery);
    await pool.query(proposalsTableQuery);
    await pool.query(votesTableQuery);
    await pool.query(delegationsTableQuery);
    await pool.query(federationTreatiesTableQuery);
    await pool.query(governanceEventsTableQuery);
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Governance tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating governance tables:', err);
  }
};

export { createGovernanceTables };
