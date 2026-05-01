import pool from '../backend/db.js';

const createDiscordConfigTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS community_discord_config (
      community_id INTEGER PRIMARY KEY REFERENCES communities(id) ON DELETE CASCADE,
      guild_id TEXT NOT NULL,
      need_channel_id TEXT,
      alert_channel_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_discord_config_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_discord_config_updated_at') THEN
        CREATE TRIGGER set_discord_config_updated_at
        BEFORE UPDATE ON community_discord_config
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_discord_config_timestamp();
      END IF;
    END
    $$;
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: community_discord_config table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: community_discord_config updated_at trigger created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating community_discord_config table or trigger:', err);
  }
};

export {
  createDiscordConfigTable,
};
