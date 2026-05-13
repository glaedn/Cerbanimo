import pool from '../db.js';
import TreasuryService from './TreasuryService.js';
import { sendNotification } from './NotificationService.js';

class BountyService {
  async createBounty(communityId, data, externalClient = null) {
    const { title, description, skillId, rewardAmount, treasurySource, deliverableDescription } = data;
    const db = externalClient || pool;

    // Check treasury balance before creating (as a preliminary check)
    const treasury = await TreasuryService.getTreasury(communityId, externalClient);
    const balance = treasurySource === 'solidarity_fund' ? treasury.solidarity_fund : treasury.cotoken_balance;

    if (parseFloat(balance) < rewardAmount) {
      throw new Error(`Insufficient funds in ${treasurySource}`);
    }

    const query = `
      INSERT INTO bounties (title, description, posted_by_community_id, skill_id, reward_amount, treasury_source, deliverable_description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await db.query(query, [title, description, communityId, skillId, rewardAmount, treasurySource, deliverableDescription]);
    return result.rows[0];
  }

  async claimBounty(bountyId, userId) {
    const result = await pool.query(
      "UPDATE bounties SET claimed_by_user_id = $1, status = 'claimed', updated_at = NOW() WHERE id = $2 AND status = 'open' RETURNING *",
      [userId, bountyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Bounty not found or already claimed');
    }

    return result.rows[0];
  }

  async verifyAndPayBounty(bountyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bountyRes = await client.query('SELECT * FROM bounties WHERE id = $1 FOR UPDATE', [bountyId]);
      if (bountyRes.rows.length === 0) throw new Error('Bounty not found');
      const bounty = bountyRes.rows[0];

      if (bounty.status !== 'claimed') {
        throw new Error('Bounty must be claimed before it can be verified and paid');
      }

      // Perform transfer from community treasury to user, passing the client
      await TreasuryService.transferFunds(
        bounty.posted_by_community_id,
        bounty.claimed_by_user_id,
        bounty.reward_amount,
        'user',
        `Bounty payout: ${bounty.title}`,
        { relatedEntityType: 'bounty', relatedEntityId: bounty.id },
        client
      );

      await client.query("UPDATE bounties SET status = 'paid', updated_at = NOW() WHERE id = $1", [bountyId]);

      await client.query('COMMIT');

      await sendNotification(bounty.claimed_by_user_id, {
        message: `Bounty Paid! You received ${bounty.reward_amount} cotokens for "${bounty.title}".`,
        type: 'bounty_paid'
      });

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new BountyService();
