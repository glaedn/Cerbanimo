const pool = require('../backend/db.js');

const createMembershipRequestsTable = async () => {
  const membershipRequestsTableQuery = `
    CREATE TABLE IF NOT EXISTS membership_requests (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      votes JSONB DEFAULT '{}'::jsonb, -- To store voter IDs and their boolean votes
      status VARCHAR(50) DEFAULT 'pending', -- e.g., pending, approved, rejected
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (community_id, user_id) -- Ensures a user can only request to join a community once
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_membership_requests_updated_at
    BEFORE UPDATE ON membership_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `;

  try {
    await pool.query(membershipRequestsTableQuery);
    console.log('PostgreSQL: Membership_requests table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Trigger set_membership_requests_updated_at created for membership_requests table.');
  } catch (err) {
    console.error('PostgreSQL: Error creating membership_requests table or trigger:', err);
    // It's possible the trigger function already exists from other table creations,
    // so a specific error check for 'duplicate function' might be useful here if needed.
    if (err.code === '42723' && err.message.includes('trigger_set_timestamp')) {
        console.log('PostgreSQL: Trigger function trigger_set_timestamp already exists, proceeding to create trigger.');
        // Attempt to create just the trigger if the function exists
        const createTriggerOnlyQuery = `
          CREATE TRIGGER set_membership_requests_updated_at
          BEFORE UPDATE ON membership_requests
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_timestamp();
        `;
        try {
            await pool.query(createTriggerOnlyQuery);
            console.log('PostgreSQL: Trigger set_membership_requests_updated_at created successfully for membership_requests table after "duplicate function" error.');
        } catch (triggerErr) {
            console.error('PostgreSQL: Error creating trigger for membership_requests after "duplicate function" error:', triggerErr);
        }
    } else if (err.code === '42710' && err.message.includes('trigger "set_membership_requests_updated_at" for relation "membership_requests" already exists')) {
        console.log('PostgreSQL: Trigger set_membership_requests_updated_at already exists for membership_requests table.');
    } else {
        // For other errors, re-throw or handle as appropriate
        // console.error('PostgreSQL: Error creating membership_requests table or trigger:', err);
    }
  }
};

module.exports = {
  createMembershipRequestsTable,
};
