import pool from '../backend/db.js';

const createCivicKernelTables = async () => {
  const eventsTableQuery = `
    CREATE TABLE IF NOT EXISTS civic_events (
      id BIGSERIAL PRIMARY KEY,
      event_type VARCHAR(120) NOT NULL,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subject_type VARCHAR(80) NOT NULL,
      subject_id INTEGER,
      scope_type VARCHAR(80),
      scope_id INTEGER,
      payload JSONB DEFAULT '{}'::jsonb,
      causation_event_id BIGINT REFERENCES civic_events(id) ON DELETE SET NULL,
      correlation_id VARCHAR(120),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const worldNodesTableQuery = `
    CREATE TABLE IF NOT EXISTS world_nodes (
      id BIGSERIAL PRIMARY KEY,
      node_type VARCHAR(80) NOT NULL,
      entity_type VARCHAR(80),
      entity_id INTEGER,
      label TEXT NOT NULL,
      description TEXT,
      status VARCHAR(80),
      properties JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_world_nodes_entity_unique
      ON world_nodes(node_type, entity_type, entity_id)
      WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
  `;

  const worldEdgesTableQuery = `
    CREATE TABLE IF NOT EXISTS world_edges (
      id BIGSERIAL PRIMARY KEY,
      from_node_id BIGINT REFERENCES world_nodes(id) ON DELETE CASCADE,
      to_node_id BIGINT REFERENCES world_nodes(id) ON DELETE CASCADE,
      relationship_type VARCHAR(100) NOT NULL,
      confidence NUMERIC(4,3) DEFAULT 1.0,
      properties JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_node_id, to_node_id, relationship_type)
    );
  `;

  const intentsTableQuery = `
    CREATE TABLE IF NOT EXISTS intent_records (
      id BIGSERIAL PRIMARY KEY,
      intent_type VARCHAR(80) NOT NULL,
      source_type VARCHAR(80),
      source_id INTEGER,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT,
      classification JSONB DEFAULT '{}'::jsonb,
      priority_score NUMERIC(6,2) DEFAULT 0,
      status VARCHAR(80) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_civic_kernel_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_world_node_updated_at') THEN
        CREATE TRIGGER set_world_node_updated_at
        BEFORE UPDATE ON world_nodes
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_civic_kernel_timestamp();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_intent_record_updated_at') THEN
        CREATE TRIGGER set_intent_record_updated_at
        BEFORE UPDATE ON intent_records
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_civic_kernel_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_civic_events_type ON civic_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_civic_events_subject ON civic_events(subject_type, subject_id);
    CREATE INDEX IF NOT EXISTS idx_civic_events_actor ON civic_events(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_civic_events_created_at ON civic_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_civic_events_payload ON civic_events USING GIN(payload);

    CREATE INDEX IF NOT EXISTS idx_world_nodes_type ON world_nodes(node_type);
    CREATE INDEX IF NOT EXISTS idx_world_nodes_status ON world_nodes(status);
    CREATE INDEX IF NOT EXISTS idx_world_nodes_properties ON world_nodes USING GIN(properties);

    CREATE INDEX IF NOT EXISTS idx_world_edges_from ON world_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_world_edges_to ON world_edges(to_node_id);
    CREATE INDEX IF NOT EXISTS idx_world_edges_relationship ON world_edges(relationship_type);

    CREATE INDEX IF NOT EXISTS idx_intent_records_source ON intent_records(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_intent_records_type ON intent_records(intent_type);
    CREATE INDEX IF NOT EXISTS idx_intent_records_status ON intent_records(status);
    CREATE INDEX IF NOT EXISTS idx_intent_records_classification ON intent_records USING GIN(classification);
  `;

  try {
    await pool.query(eventsTableQuery);
    await pool.query(worldNodesTableQuery);
    await pool.query(worldEdgesTableQuery);
    await pool.query(intentsTableQuery);
    await pool.query(triggerQuery);
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Civic kernel tables created or already exist.');
  } catch (err) {
    console.error('PostgreSQL: Error creating civic kernel tables:', err);
  }
};

export { createCivicKernelTables };
