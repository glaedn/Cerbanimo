const pool = require('../../backend/db.js'); // Path relative to models/

const createNotificationsTable = async () => {
  const tableQuery = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL, -- e.g., 'task_assigned', 'task_approved', 'mention', 'badge_awarded'
      message_details JSONB NOT NULL, -- Changed from 'message TEXT'
      link_entity_type VARCHAR(50), -- e.g., 'task', 'project', 'user_profile', 'community'
      link_entity_id INTEGER,
      is_read BOOLEAN NOT NULL DEFAULT FALSE, -- Replaces/clarifies 'read_at' for primary read status
      read_at TIMESTAMP WITH TIME ZONE, -- Optional, for when it was read
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- For internal use, if notifications themselves can be updated
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_notification_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_notification_updated_at') THEN
        CREATE TRIGGER set_notification_updated_at
        BEFORE UPDATE ON notifications
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_notification_timestamp();
      END IF;
    END
    $$;
  `;

  const indexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read); -- New index
  `;

  try {
    await pool.query(tableQuery);
    console.log('PostgreSQL: Notifications table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Notifications updated_at trigger created or already exists.');
    await pool.query(indexesQuery);
    console.log('PostgreSQL: Indexes on notifications table created or ensured.');
  } catch (err) {
    console.error('PostgreSQL: Error creating notifications table, trigger, or indexes:', err);
  }
};

module.exports = {
  createNotificationsTable,
};
