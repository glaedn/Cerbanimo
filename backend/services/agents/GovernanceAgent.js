import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class GovernanceAgent extends BaseAgent {
  constructor() {
    super('GovernanceAgent', 'system', 0);
  }

  async process() {
    const communities = await pool.query('SELECT id, name, governance_config FROM communities');
    for (const community of communities.rows) {
       await this.analyzeParticipation(community);
       await this.detectAuthorityConcentration(community);
    }
  }

  async analyzeParticipation(community) {
    const proposals = await pool.query(
      "SELECT id FROM proposals WHERE community_id = $1 AND status IN ('deliberation', 'voting')",
      [community.id]
    );

    if (proposals.rows.length === 0) return;

    for (const prop of proposals.rows) {
      const votes = await pool.query('SELECT count(*) FROM votes WHERE proposal_id = $1', [prop.id]);
      const participationCount = parseInt(votes.rows[0].count);

      const memberCountRes = await pool.query('SELECT array_length(members, 1) FROM communities WHERE id = $1', [community.id]);
      const memberCount = memberCountRes.rows[0]?.array_length || 1;

      const participationRate = participationCount / memberCount;

      if (participationRate < (community.governance_config.quorum || 0.1)) {
        await this.logEvent(`Low participation detected for proposal ${prop.id} in ${community.name}. Current rate: ${(participationRate * 100).toFixed(1)}%`, {
          proposalId: prop.id,
          communityId: community.id,
          type: 'participation_risk'
        });
      }
    }
  }

  async detectAuthorityConcentration(community) {
     // Check if a single user holds > 30% of delegated power
     const { calculateVoteWeight } = await import('../../utils/voteWeight.js');
     const { totalPossibleWeight } = await calculateVoteWeight(pool, community.id);

     const membersRes = await pool.query('SELECT unnest(members) as user_id FROM communities WHERE id = $1', [community.id]);
     for (const member of membersRes.rows) {
        const { weight } = await calculateVoteWeight(pool, community.id, member.user_id);
        if (weight / totalPossibleWeight > 0.3) {
           await this.logEvent(`High authority concentration detected for user ${member.user_id} in ${community.name}. Holds ${(weight/totalPossibleWeight*100).toFixed(1)}% of voting weight.`, {
             communityId: community.id,
             userId: member.user_id,
             type: 'centralization_risk'
           });
        }
     }
  }
}

export default new GovernanceAgent();
