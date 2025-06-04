const pool = require('../backend/db.js'); // Adjust path as necessary based on project structure

const createExchangesTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS exchanges (
      id SERIAL PRIMARY KEY, -- Using SERIAL for simplicity, can be UUID if preferred
      need_id INTEGER NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- e.g., 'initiated', 'pending_pickup', 'pending_delivery', 'completed', 'cancelled'
      notes TEXT, -- Optional notes about the exchange
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_exchange_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exchange_updated_at') THEN
        CREATE TRIGGER set_exchange_updated_at
        BEFORE UPDATE ON exchanges
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_exchange_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_exchanges_need_id ON exchanges(need_id);
    CREATE INDEX IF NOT EXISTS idx_exchanges_resource_id ON exchanges(resource_id);
    CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: exchanges table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: exchanges updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on exchanges table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating exchanges table, trigger, or indexes:', err);
    // This assumes 'needs' and 'resources' tables exist as per their own model files.
  }
};

module.exports = {
  createExchangesTable,
};
