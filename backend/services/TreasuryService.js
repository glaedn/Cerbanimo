import pool from '../db.js';
import ImpactReceiptService from './ImpactReceiptService.js';

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
      const initResult = await db.query(
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
        const ledgerRes = await client.query(
          `INSERT INTO community_reciprocity_ledger (from_community_id, to_community_id, aid_type, value_in_cotokens)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [fromCommunityId, toId, 'token', amount]
        );

        // Auto-generate impact receipt
        await ImpactReceiptService.generateReceipt({
          aidEventId: ledgerRes.rows[0].id,
          providerCommunityId: fromCommunityId,
          recipientCommunityId: toId,
          aidType: 'token',
          quantity: amount,
          unit: 'cotoken',
          verifiedBy: metadata.createdBy ? [metadata.createdBy] : [],
          verificationMethod: 'system',
          narrative: `Automated receipt for community fund transfer: ${purpose}`
        }, client);

      } else if (toType === 'user') {
        const { default: TokenBridgeService } = await import('./TokenBridgeService.js');
        await TokenBridgeService.routeTransaction({
          senderId: fromCommunityId,
          receiverId: toId,
          amount: amount,
          type: 'community_to_user_internal',
          reason: `Treasury payout: ${purpose}`,
          metadata: { ...metadata, createdBy: metadata.createdBy }
        }, client);
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
