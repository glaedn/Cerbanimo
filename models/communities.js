const pool = require('../../backend/db.js'); // Assuming shared pool

const createCommunitiesTable = async () => {
    const communityTableQuery = `
      CREATE TABLE IF NOT EXISTS communities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members INTEGER[] DEFAULT '{}', -- Array of user IDs, FK to users.id
        interest_tags INTEGER[] DEFAULT '{}', -- Array of interest IDs, FK to interests.id
        proposals INTEGER[] DEFAULT '{}', -- Array of project IDs, FK to projects.id
        approved_projects INTEGER[] DEFAULT '{}', -- Array of project IDs, FK to projects.id
        vote_delegations JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

      CREATE TRIGGER set_community_updated_at
      BEFORE UPDATE ON communities
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
    `;

    try {
      await pool.query(communityTableQuery);
      console.log('PostgreSQL: Communities table created or already exists.');
      await pool.query(triggerQuery);
      console.log('PostgreSQL: Trigger set_community_updated_at created for communities table.');
    } catch (err) {
      console.error('PostgreSQL: Error creating communities table or trigger:', err);
    }
  };
  

module.exports = {
  createCommunitiesTable, // PostgreSQL
};