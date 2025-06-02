const pool = require('../backend/db'); // Assuming db.js is in the backend directory

const createResourceTransactionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS resource_transactions (
      id SERIAL PRIMARY KEY,
      need_id INTEGER REFERENCES needs(id) ON DELETE SET NULL,
      resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
      provider_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      receiver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      provider_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      receiver_community_id INTEGER REFERENCES communities(id) ON DELETE SET NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending_provider_acceptance',
      -- Possible statuses: pending_provider_acceptance, pending_receiver_acceptance, accepted, fulfilled, cancelled_by_provider, cancelled_by_receiver, declined_by_provider, declined_by_receiver
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT check_either_provider CHECK (provider_user_id IS NOT NULL OR provider_community_id IS NOT NULL),
      CONSTRAINT check_either_receiver CHECK (receiver_user_id IS NOT NULL OR receiver_community_id IS NOT NULL)
    );
  `;
  try {
    await pool.query(query);
    console.log('Resource transactions table created successfully');
  } catch (err) {
    console.error('Error creating resource_transactions table:', err);
    throw err;
  }
};

const createResourceTransactionsUpdatedAtTrigger = async () => {
  const triggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS resource_transactions_updated_at_trigger ON resource_transactions;
    CREATE TRIGGER resource_transactions_updated_at_trigger
    BEFORE UPDATE ON resource_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `;
  try {
    // Ensure the function exists first (it's generic, might be created by other models)
    // await pool.query(`
    //   CREATE OR REPLACE FUNCTION update_updated_at_column()
    //   RETURNS TRIGGER AS $$
    //   BEGIN
    //     NEW.updated_at = CURRENT_TIMESTAMP;
    //     RETURN NEW;
    //   END;
    //   $$ LANGUAGE plpgsql;
    // `);
    await pool.query(triggerQuery);
    console.log('Resource transactions updated_at trigger created successfully');
  } catch (err) {
    console.error('Error creating resource_transactions updated_at trigger:', err);
    // Do not throw if the function already exists, or other common errors that are not critical
    if (err.code !== '42710') { // 42710 is duplicate_function error
         //throw err; // Re-throw other errors
    } else {
        console.log('Function update_updated_at_column already exists, skipping creation.');
    }
    // Also check for trigger already exists error if needed, or use DROP TRIGGER IF EXISTS
  }
};

module.exports = {
  createResourceTransactionsTable,
  createResourceTransactionsUpdatedAtTrigger,
};
