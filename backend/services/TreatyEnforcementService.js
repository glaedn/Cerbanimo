import pool from '../db.js';
import TreasuryService from './TreasuryService.js';
import FederationService from './FederationService.js';

class TreatyEnforcementService {
  async runEnforcementCycle() {
    console.log('Running federation treaty enforcement cycle...');
    try {
      const activeTreaties = await pool.query("SELECT * FROM federation_treaties WHERE status = 'active'");
      for (const treaty of activeTreaties.rows) {
        await this.enforceTreaty(treaty);
      }
      console.log(`Enforcement cycle complete. Processed ${activeTreaties.rows.length} treaties.`);
    } catch (err) {
      console.error('Error in treaty enforcement cycle:', err);
    }
  }

  async enforceTreaty(treaty) {
    const { terms } = treaty;
    if (!terms) return;

    // 1. Solidarity Contributions
    if (terms.solidarity_contribution) {
      await this.enforceSolidarityContribution(treaty, terms.solidarity_contribution, treaty.community_a);
      await this.enforceSolidarityContribution(treaty, terms.solidarity_contribution, treaty.community_b);
    }

    // 2. Mutual Aid Commitments (Triggered by conditions, but we can check limits here)
    if (terms.mutual_aid_commitment) {
       // Future: Check if monthly limits exceeded, etc.
    }
  }

  async enforceSolidarityContribution(treaty, config, communityId) {
    const { percentage_of_treasury, frequency } = config;
    if (frequency !== 'monthly') return; // Only monthly for now

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if already contributed this month
      const lastContribution = await client.query(
        `SELECT created_at FROM treasury_transactions
         WHERE treasury_id IN (SELECT id FROM community_treasury WHERE community_id = $1)
         AND purpose = 'solidarity_contribution'
         AND created_at > date_trunc('month', now())`,
        [communityId]
      );

      if (lastContribution.rows.length === 0) {
        const treasury = await TreasuryService.getTreasury(communityId, client, true);
        const amount = (parseFloat(treasury.cotoken_balance) * percentage_of_treasury) / 100;

        if (amount > 0) {
          console.log(`Enforcing solidarity contribution for community ${communityId}: ${amount} tokens`);

          await client.query(
            'UPDATE community_treasury SET cotoken_balance = cotoken_balance - $1, solidarity_fund = solidarity_fund + $1 WHERE community_id = $2',
            [amount, communityId]
          );

          await TreasuryService.recordTransaction(client, treasury.id, amount, 'out', 'solidarity_contribution', {
            relatedEntityType: 'treaty',
            relatedEntityId: treaty.id
          });

          await FederationService.recordFederationEvent(communityId, 'treaty.contribution_enforced', {
            amount,
            treatyId: treaty.id
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed to enforce solidarity contribution for community ${communityId}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new TreatyEnforcementService();
