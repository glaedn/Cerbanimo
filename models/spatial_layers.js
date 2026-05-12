import pool from '../backend/db.js';

const createSpatialLayerTables = async () => {
  const locationsTableQuery = `
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      geometry GEOGRAPHY(Geometry, 4326) NOT NULL,
      region_type VARCHAR(50), -- 'city', 'district', 'zone', 'mutual_aid_region', 'crisis_boundary'
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const spatialEventsTableQuery = `
    CREATE TABLE IF NOT EXISTS spatial_events (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      location GEOGRAPHY(Point, 4326),
      radius NUMERIC, -- in meters
      severity VARCHAR(50),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const dispatchRoutesTableQuery = `
    CREATE TABLE IF NOT EXISTS dispatch_routes (
      id SERIAL PRIMARY KEY,
      origin GEOGRAPHY(Point, 4326),
      destination GEOGRAPHY(Point, 4326),
      assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled'
      estimated_time_minutes INTEGER,
      actual_time_minutes INTEGER,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const regionalMetricsTableQuery = `
    CREATE TABLE IF NOT EXISTS regional_metrics (
      id SERIAL PRIMARY KEY,
      region_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
      need_density NUMERIC,
      resource_density NUMERIC,
      burnout_index NUMERIC,
      response_latency NUMERIC,
      trust_index NUMERIC,
      civic_strain_indicator NUMERIC,
      response_readiness_score NUMERIC,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_spatial_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_location_updated_at') THEN
        CREATE TRIGGER set_location_updated_at
        BEFORE UPDATE ON locations
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_spatial_timestamp();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_dispatch_route_updated_at') THEN
        CREATE TRIGGER set_dispatch_route_updated_at
        BEFORE UPDATE ON dispatch_routes
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_spatial_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_locations_geometry ON locations USING GIST(geometry);
    CREATE INDEX IF NOT EXISTS idx_spatial_events_location ON spatial_events USING GIST(location);
    CREATE INDEX IF NOT EXISTS idx_dispatch_routes_origin ON dispatch_routes USING GIST(origin);
    CREATE INDEX IF NOT EXISTS idx_dispatch_routes_destination ON dispatch_routes USING GIST(destination);
    CREATE INDEX IF NOT EXISTS idx_regional_metrics_region_id ON regional_metrics(region_id);
  `;

  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    await pool.query(locationsTableQuery);
    await pool.query(spatialEventsTableQuery);
    await pool.query(dispatchRoutesTableQuery);
    await pool.query(regionalMetricsTableQuery);
    await pool.query(triggerQuery);
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Spatial layer infrastructure initialized successfully.');
  } catch (err) {
    console.error('PostgreSQL: Error initializing spatial layer infrastructure:', err);
    throw err;
  }
};

export { createSpatialLayerTables };
