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
      await this.enforceSolidarityContribution(treaty, terms.solidarity_contribution);
    }

    // 2. Mutual Aid Commitments (Triggered by conditions, but we can check limits here)
    if (terms.mutual_aid_commitment) {
       // Future: Check if monthly limits exceeded, etc.
    }
  }

  async enforceSolidarityContribution(treaty, config) {
    const { percentage_of_treasury, frequency } = config;
    if (frequency !== 'monthly') return; // Only monthly for now

    // Check if already contributed this month
    const lastContribution = await pool.query(
      `SELECT created_at FROM treasury_transactions
       WHERE treasury_id IN (SELECT id FROM community_treasury WHERE community_id = $1)
       AND purpose = 'solidarity_contribution'
       AND created_at > date_trunc('month', now())`,
      [treaty.community_a]
    );

    if (lastContribution.rows.length === 0) {
      const treasury = await TreasuryService.getTreasury(treaty.community_a);
      const amount = (parseFloat(treasury.cotoken_balance) * percentage_of_treasury) / 100;

      if (amount > 0) {
        console.log(`Enforcing solidarity contribution for community ${treaty.community_a}: ${amount} tokens`);
        // Transfer to a shared fund or just deduct for now as placeholder
        await pool.query(
          'UPDATE community_treasury SET cotoken_balance = cotoken_balance - $1, solidarity_fund = solidarity_fund + $1 WHERE community_id = $2',
          [amount, treaty.community_a]
        );

        await TreasuryService.recordTransaction(pool, treasury.id, amount, 'out', 'solidarity_contribution', {
          relatedEntityType: 'treaty',
          relatedEntityId: treaty.id
        });

        await FederationService.recordFederationEvent(treaty.community_a, 'treaty.contribution_enforced', {
          amount,
          treatyId: treaty.id
        });
      }
    }
  }
}

export default new TreatyEnforcementService();
