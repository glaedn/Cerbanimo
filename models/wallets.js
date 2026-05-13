import pool from '../backend/db.js';

const createWalletTable = async () => {
  const walletTableQuery = `
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
      address VARCHAR(255) UNIQUE NOT NULL,
      chain VARCHAR(50) NOT NULL, -- 'ethereum', 'polygon', 'celo', etc.
      wallet_type VARCHAR(50),    -- 'metamask', 'safe', 'external'
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT user_or_community_not_null CHECK (user_id IS NOT NULL OR community_id IS NOT NULL)
    );
  `;

  const triggerQuery = `
    CREATE OR REPLACE FUNCTION trigger_set_wallet_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_wallet_updated_at' AND tgrelid = 'wallets'::regclass) THEN
        CREATE TRIGGER set_wallet_updated_at
        BEFORE UPDATE ON wallets
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_wallet_timestamp();
      END IF;
    END
    $$;
  `;

  try {
    await pool.query(walletTableQuery);
    console.log('PostgreSQL: Wallets table created or already exists.');
    await pool.query(triggerQuery);
    console.log('PostgreSQL: Wallets updated_at trigger created or already exists.');
  } catch (err) {
    console.error('PostgreSQL: Error creating wallets table or trigger:', err);
  }
};

export { createWalletTable };
