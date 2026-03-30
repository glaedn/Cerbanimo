const pool = require('../backend/db.js');

const createGuildTables = async () => {
  const guildsTableQuery = `
    CREATE TABLE IF NOT EXISTS guilds (
      id SERIAL PRIMARY KEY,
      skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'forming', -- 'forming', 'active', 'dormant', 'dissolved'
      member_count INTEGER DEFAULT 0,
      founded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const guildMembershipsTableQuery = `
    CREATE TABLE IF NOT EXISTS guild_memberships (
      id SERIAL PRIMARY KEY,
      guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'Apprentice', -- 'Apprentice', 'Specialist', 'Architect', 'Mentor', 'Moderator'
      xp INTEGER DEFAULT 0, -- secondary to story patterns
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, user_id)
    );
  `;

  const guildMetricsTableQuery = `
    CREATE TABLE IF NOT EXISTS guild_metrics (
      id SERIAL PRIMARY KEY,
      guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
      task_demand NUMERIC, -- Demand score per skill
      completion_rate NUMERIC,
      reward_average NUMERIC,
      verification_pass_rate NUMERIC,
      health_score NUMERIC,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const skillRequestsTableQuery = `
    CREATE TABLE IF NOT EXISTS skill_requests (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      skill_name VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'denied'
      approvals INTEGER[] DEFAULT '{}', -- User IDs of approvers
      denials INTEGER[] DEFAULT '{}', -- User IDs of deniers
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(guildsTableQuery);
    await pool.query(guildMembershipsTableQuery);
    await pool.query(guildMetricsTableQuery);
    await pool.query(skillRequestsTableQuery);
    console.log('PostgreSQL: Guild tables created.');
  } catch (err) {
    console.error('PostgreSQL: Error creating guild tables:', err);
  }
};

module.exports = { createGuildTables };
