import pool from '../backend/db.js';

const createIntegrationTables = async () => {
  const communityIntegrationsQuery = `
    CREATE TABLE IF NOT EXISTS community_integrations (
        id SERIAL PRIMARY KEY,
        community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        external_workspace_id TEXT,
        external_channel_id TEXT,
        config JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(community_id, platform, external_workspace_id, external_channel_id)
    );
  `;

  const userIntegrationsQuery = `
    CREATE TABLE IF NOT EXISTS user_integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        external_user_id TEXT NOT NULL,
        username TEXT,
        avatar_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, platform),
        UNIQUE(platform, external_user_id)
    );
  `;

  try {
    await pool.query(communityIntegrationsQuery);
    console.log('PostgreSQL: community_integrations table created or already exists.');
    await pool.query(userIntegrationsQuery);
    console.log('PostgreSQL: user_integrations table created or already exists.');

    // --- LEGACY MIGRATION ---
    console.log('PostgreSQL: Running legacy integration migration...');

    // Migrate users
    await pool.query(`
      INSERT INTO user_integrations (user_id, platform, external_user_id, username, created_at)
      SELECT id, 'discord', discord_user_id, username, created_at
      FROM users
      WHERE discord_user_id IS NOT NULL
      ON CONFLICT (user_id, platform) DO NOTHING;
    `);

    // Migrate communities
    // We check if community_discord_config exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'community_discord_config'
      );
    `);

    if (tableCheck.rows[0].exists) {
      await pool.query(`
        INSERT INTO community_integrations (community_id, platform, external_workspace_id, external_channel_id, created_at)
        SELECT community_id, 'discord', guild_id, need_channel_id, created_at
        FROM community_discord_config
        ON CONFLICT (community_id, platform) DO NOTHING;
      `);
    }

    console.log('PostgreSQL: Legacy integration migration complete.');
  } catch (err) {
    console.error('PostgreSQL: Error creating integration tables or migrating data:', err);
  }
};

export {
  createIntegrationTables,
};
