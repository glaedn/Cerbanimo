import pool from '../db.js';

class TreasuryService {
  async getTreasury(communityId, client = null, lock = false) {
    const db = client || pool;
    const lockClause = lock ? 'FOR UPDATE' : '';
    const result = await db.query(
      `SELECT * FROM community_treasury WHERE community_id = $1 ${lockClause}`,
      [communityId]
    );

    if (result.rows.length === 0) {
      // Auto-initialize treasury if it doesn't exist
      const initResult = await pool.query(
        'INSERT INTO community_treasury (community_id) VALUES ($1) ON CONFLICT (community_id) DO NOTHING RETURNING *',
        [communityId]
      );
      if (initResult.rows.length === 0) {
        return this.getTreasury(communityId, client, lock);
      }
      return initResult.rows[0];
    }

    return result.rows[0];
  }

  async recordTransaction(client, treasuryId, amount, direction, purpose, metadata = {}) {
    const {
      currency = 'cotoken',
      relatedEntityType = null,
      relatedEntityId = null,
      counterpartyCommunityId = null,
      createdBy = null
    } = metadata;

    const query = `
      INSERT INTO treasury_transactions (
        treasury_id, amount, direction, purpose, currency,
        related_entity_type, related_entity_id, counterparty_community_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await client.query(query, [
      treasuryId, amount, direction, purpose, currency,
      relatedEntityType, relatedEntityId, counterpartyCommunityId, createdBy
    ]);
    return result.rows[0];
  }

  async transferFunds(fromCommunityId, toId, amount, toType, purpose, metadata = {}, externalClient = null) {
    const client = externalClient || await pool.connect();
    let isInternalTransaction = !externalClient;

    try {
      if (isInternalTransaction) await client.query('BEGIN');

      const treasury = await this.getTreasury(fromCommunityId, client, true);
      if (parseFloat(treasury.cotoken_balance) < amount) {
        throw new Error(`Insufficient treasury balance in community ${fromCommunityId}`);
      }

      // 1. Deduct from source treasury
      await client.query(
        'UPDATE community_treasury SET cotoken_balance = cotoken_balance - $1 WHERE community_id = $2',
        [amount, fromCommunityId]
      );

      // 2. Record outgoing transaction
      await this.recordTransaction(client, treasury.id, amount, 'out', purpose, {
        ...metadata,
        relatedEntityType: toType === 'community' ? 'community' : 'user',
        relatedEntityId: toId,
        counterpartyCommunityId: toType === 'community' ? toId : null
      });

      // 3. Deposit to destination
      if (toType === 'community') {
        const destTreasury = await this.getTreasury(toId, client, true);
        await client.query(
          'UPDATE community_treasury SET cotoken_balance = cotoken_balance + $1 WHERE community_id = $2',
          [amount, toId]
        );
        await this.recordTransaction(client, destTreasury.id, amount, 'in', purpose, {
          ...metadata,
          relatedEntityType: 'community',
          relatedEntityId: fromCommunityId,
          counterpartyCommunityId: fromCommunityId
        });

        // Record in reciprocity ledger
        await client.query(
          `INSERT INTO community_reciprocity_ledger (from_community_id, to_community_id, aid_type, value_in_cotokens)
           VALUES ($1, $2, $3, $4)`,
          [fromCommunityId, toId, 'token', amount]
        );
      } else if (toType === 'user') {
        await client.query(
          'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2',
          [amount, toId]
        );
        // Record in token_transactions as well for user history
        await client.query(
          `INSERT INTO token_transactions (sender_id, receiver_id, amount, reason, transaction_date)
           VALUES (NULL, $1, $2, $3, NOW())`,
          [toId, amount, `Treasury payout: ${purpose}`]
        );
      }

      if (isInternalTransaction) await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      if (isInternalTransaction) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (isInternalTransaction) client.release();
    }
  }

  async depositToTreasury(communityId, amount, purpose, metadata = {}, externalClient = null) {
    const client = externalClient || await pool.connect();
    let isInternalTransaction = !externalClient;

    try {
      if (isInternalTransaction) await client.query('BEGIN');
      const treasury = await this.getTreasury(communityId, client, true);

      await client.query(
        'UPDATE community_treasury SET cotoken_balance = cotoken_balance + $1 WHERE community_id = $2',
        [amount, communityId]
      );

      await this.recordTransaction(client, treasury.id, amount, 'in', purpose, metadata);

      if (isInternalTransaction) await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      if (isInternalTransaction) await client.query('ROLLBACK');
      throw err;
    } finally {
      if (isInternalTransaction) client.release();
    }
  }
}

export default new TreasuryService();
