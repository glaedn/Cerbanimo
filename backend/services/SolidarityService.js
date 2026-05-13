import pool from '../db.js';
import TreasuryService from './TreasuryService.js';

class SolidarityService {
  async contributeToPool(poolId, communityId, amount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const treasury = await TreasuryService.getTreasury(communityId, client, true);
      if (parseFloat(treasury.cotoken_balance) < amount) {
        throw new Error('Insufficient treasury balance for solidarity contribution');
      }

      // Deduct from community treasury
      await client.query(
        'UPDATE community_treasury SET cotoken_balance = cotoken_balance - $1 WHERE community_id = $2',
        [amount, communityId]
      );

      // Add to solidarity pool
      await client.query(
        'UPDATE solidarity_pools SET total_balance = total_balance + $1 WHERE id = $2',
        [amount, poolId]
      );

      // Record transaction
      await TreasuryService.recordTransaction(client, treasury.id, amount, 'out', 'solidarity_contribution', {
        relatedEntityType: 'solidarity_pool',
        relatedEntityId: poolId
      });

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async requestDraw(poolId, communityId, amount, purpose, crisisLevel) {
    const query = `
      INSERT INTO solidarity_draws (pool_id, requesting_community_id, amount_requested, purpose, crisis_level)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [poolId, communityId, amount, purpose, crisisLevel]);
    return result.rows[0];
  }

  async executeDraw(drawId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const drawRes = await client.query('SELECT * FROM solidarity_draws WHERE id = $1 FOR UPDATE', [drawId]);
      if (drawRes.rows.length === 0) throw new Error('Draw request not found');
      const draw = drawRes.rows[0];

      if (draw.status !== 'approved') {
        throw new Error('Draw must be approved before execution');
      }

      const poolRes = await client.query('SELECT * FROM solidarity_pools WHERE id = $1 FOR UPDATE', [draw.pool_id]);
      const solPool = poolRes.rows[0];

      if (parseFloat(solPool.total_balance) < parseFloat(draw.amount_requested)) {
        throw new Error('Insufficient funds in solidarity pool');
      }

      // Deduct from pool
      await client.query(
        'UPDATE solidarity_pools SET total_balance = total_balance - $1 WHERE id = $2',
        [draw.amount_requested, draw.pool_id]
      );

      // Deposit to community treasury, passing the client
      await TreasuryService.depositToTreasury(
        draw.requesting_community_id,
        draw.amount_requested,
        'solidarity_draw_disbursement',
        { relatedEntityType: 'solidarity_pool', relatedEntityId: draw.pool_id },
        client
      );

      await client.query(
        "UPDATE solidarity_draws SET status = 'disbursed', disbursed_at = NOW() WHERE id = $1",
        [drawId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new SolidarityService();
