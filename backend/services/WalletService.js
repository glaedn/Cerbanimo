import pool from '../db.js';

class WalletService {
  async registerWallet({ userId, communityId, address, chain, walletType, isPrimary = false }) {
    if (!userId && !communityId) {
      throw new Error('Either userId or communityId must be provided.');
    }
    if (!address || !chain) {
      throw new Error('Address and chain are required.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (isPrimary) {
        // Unset other primary wallets for this user/community on this chain
        const unsetQuery = userId
          ? 'UPDATE wallets SET is_primary = FALSE WHERE user_id = $1 AND chain = $2'
          : 'UPDATE wallets SET is_primary = FALSE WHERE community_id = $1 AND chain = $2';
        await client.query(unsetQuery, [userId || communityId, chain]);
      }

      const insertQuery = `
        INSERT INTO wallets (user_id, community_id, address, chain, wallet_type, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (address) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          community_id = EXCLUDED.community_id,
          wallet_type = EXCLUDED.wallet_type,
          is_primary = EXCLUDED.is_primary,
          updated_at = NOW()
        RETURNING *
      `;
      const res = await client.query(insertQuery, [userId, communityId, address, chain, walletType, isPrimary]);

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getWalletsByUser(userId) {
    const res = await pool.query('SELECT * FROM wallets WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC', [userId]);
    return res.rows;
  }

  async getWalletsByCommunity(communityId) {
    const res = await pool.query('SELECT * FROM wallets WHERE community_id = $1 ORDER BY is_primary DESC, created_at DESC', [communityId]);
    return res.rows;
  }

  async getPrimaryWallet(id, type = 'user', chain = 'ethereum') {
    const column = type === 'user' ? 'user_id' : 'community_id';
    const res = await pool.query(
      `SELECT * FROM wallets WHERE ${column} = $1 AND chain = $2 AND is_primary = TRUE`,
      [id, chain]
    );
    return res.rows[0];
  }

  async deleteWallet(address) {
    const res = await pool.query('DELETE FROM wallets WHERE address = $1 RETURNING *', [address]);
    return res.rowCount > 0;
  }
}

export default new WalletService();
