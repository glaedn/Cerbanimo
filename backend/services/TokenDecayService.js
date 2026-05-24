import pool from '../db.js';

class TokenDecayService {
  async decayUserTokens(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        'SELECT id, cotokens, token_ledger FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );
      const user = userRes.rows[0];

      if (!user || Number(user.cotokens) <= 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      const gracePeriodDays = 90;
      const decayRate = 0.01;
      const now = new Date();
      const cutoff = new Date(now.getTime() - gracePeriodDays * 24 * 60 * 60 * 1000);

      let eligibleBalance = 0;
      if (user.token_ledger && Array.isArray(user.token_ledger)) {
        for (const entry of user.token_ledger) {
          const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
          if (record.creationDate && new Date(record.creationDate) < cutoff) {
            eligibleBalance += Number(record.tokens || 0);
          }
        }
      }

      eligibleBalance = Math.min(eligibleBalance, Number(user.cotokens));

      if (eligibleBalance <= 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      const decayAmount = Math.floor(eligibleBalance * decayRate);
      if (decayAmount <= 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      await client.query(
        'UPDATE users SET cotokens = cotokens - $1, total_decayed = total_decayed + $1 WHERE id = $2',
        [decayAmount, userId]
      );

      const ledgerEntry = {
        type: 'decay',
        tokens: -decayAmount,
        reason: 'Monthly 1% circulation incentive (90-day grace)',
        creationDate: now.toISOString()
      };

      await client.query(
        'UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2',
        [JSON.stringify(ledgerEntry), userId]
      );

      await client.query('COMMIT');
      return decayAmount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Decay failed for user ${userId}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  async decayCommunityTokens(communityId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const treasuryRes = await client.query(
        'SELECT * FROM community_treasury WHERE community_id = $1 FOR UPDATE',
        [communityId]
      );
      const treasury = treasuryRes.rows[0];

      if (!treasury || Number(treasury.cotoken_balance) <= 0) {
        await client.query('ROLLBACK');
        return 0;
      }

      const lastRun = treasury.last_decay_run_at ? new Date(treasury.last_decay_run_at) : new Date(0);
      const now = new Date();
      if (now.getTime() - lastRun.getTime() < 30 * 24 * 60 * 60 * 1000) {
        await client.query('ROLLBACK');
        return 0;
      }

      const decayAmount = Math.floor(Number(treasury.cotoken_balance) * 0.01);

      if (decayAmount <= 0) {
        await client.query(
          'UPDATE community_treasury SET last_decay_run_at = NOW() WHERE id = $1',
          [treasury.id]
        );
        await client.query('COMMIT');
        return 0;
      }

      await client.query(
        `UPDATE community_treasury
         SET cotoken_balance = cotoken_balance - $1,
             total_decayed = total_decayed + $1,
             last_decay_run_at = NOW()
         WHERE id = $2`,
        [decayAmount, treasury.id]
      );

      await client.query(`
        INSERT INTO treasury_transactions (treasury_id, amount, direction, purpose, created_at)
        VALUES ($1, $2, 'out', 'Monthly 1% circulation incentive', NOW())
      `, [treasury.id, decayAmount]);

      await client.query('COMMIT');
      return decayAmount;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Decay failed for community ${communityId}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new TokenDecayService();
