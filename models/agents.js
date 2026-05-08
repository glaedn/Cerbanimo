import pool from '../backend/db.js';

const createAgentTables = async () => {
  const agentInstancesTableQuery = `
    CREATE TABLE IF NOT EXISTS agent_instances (
      id SERIAL PRIMARY KEY,
      type VARCHAR(80) NOT NULL,
      scope_type VARCHAR(80),
      scope_id INTEGER,
      status VARCHAR(40) DEFAULT 'active',
      config JSONB DEFAULT '{}'::jsonb,
      memory JSONB DEFAULT '{}'::jsonb,
      last_run_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (type, scope_type, scope_id)
    );
  `;

  const agentEventsTableQuery = `
    CREATE TABLE IF NOT EXISTS agent_events (
      id BIGSERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES agent_instances(id) ON DELETE CASCADE,
      event_type VARCHAR(120) NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      confidence NUMERIC(4,3) DEFAULT 1.0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const agentRecommendationsTableQuery = `
    CREATE TABLE IF NOT EXISTS agent_recommendations (
      id BIGSERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES agent_instances(id) ON DELETE CASCADE,
      recommendation_type VARCHAR(120) NOT NULL,
      target_type VARCHAR(80),
      target_id INTEGER,
      reasoning JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(40) DEFAULT 'pending', -- pending, approved, rejected, implemented
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_agent_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agent_instance_updated_at') THEN
        CREATE TRIGGER set_agent_instance_updated_at
        BEFORE UPDATE ON agent_instances
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_agent_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_agent_instances_type ON agent_instances(type);
    CREATE INDEX IF NOT EXISTS idx_agent_instances_scope ON agent_instances(scope_type, scope_id);
    CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON agent_events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_agent_recommendations_agent_id ON agent_recommendations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_recommendations_status ON agent_recommendations(status);
    CREATE INDEX IF NOT EXISTS idx_agent_recommendations_target ON agent_recommendations(target_type, target_id);
  `;

  try {
    await pool.query(agentInstancesTableQuery);
    await pool.query(agentEventsTableQuery);
    await pool.query(agentRecommendationsTableQuery);
    await pool.query(triggerQuery);
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Agent tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating agent tables:', err);
  }
};

export { createAgentTables };
