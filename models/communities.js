const { Pool } = require('pg');

const createCommunitiesTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS public.communities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        members INTEGER[] DEFAULT '{}',
        proposals INTEGER[] DEFAULT '{}',
        approved_projects INTEGER[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await pool.query(query);
      console.log('PostgreSQL: Communities table created or already exists');
    } catch (err) {
      console.error('PostgreSQL: Error creating communities table:', err);
    }
  };
  

module.exports = {
  createCommunitiesTable, // PostgreSQL
};