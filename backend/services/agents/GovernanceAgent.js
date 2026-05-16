import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class GovernanceAgent extends BaseAgent {
  constructor(scope = { type: 'system', id: null }) {
    super('GovernanceAgent', scope);
  }

  async loadContext() {
    const communities = await pool.query('SELECT id, name, governance_config FROM communities');

    const risks = [];
    for (const community of communities.rows) {
      // Analyze Participation
      const proposals = await pool.query(
        "SELECT id FROM proposals WHERE community_id = $1 AND status IN ('deliberation', 'voting')",
        [community.id]
      );

      for (const prop of proposals.rows) {
        const votes = await pool.query('SELECT count(*) FROM votes WHERE proposal_id = $1', [prop.id]);
        const participationCount = parseInt(votes.rows[0].count);

        const memberCountRes = await pool.query('SELECT array_length(members, 1) FROM communities WHERE id = $1', [community.id]);
        const memberCount = memberCountRes.rows[0]?.array_length || 1;

        const participationRate = participationCount / memberCount;

        if (participationRate < (community.governance_config.quorum || 0.1)) {
          risks.push({
            type: 'participation_risk',
            communityId: community.id,
            communityName: community.name,
            proposalId: prop.id,
            rate: participationRate
          });
        }
      }

      // Detect Authority Concentration
      const { calculateVoteWeight } = await import('../../utils/voteWeight.js');
      const { totalPossibleWeight } = await calculateVoteWeight(pool, community.id);

      const membersRes = await pool.query('SELECT unnest(members) as user_id FROM communities WHERE id = $1', [community.id]);
      for (const member of membersRes.rows) {
        const { weight } = await calculateVoteWeight(pool, community.id, member.user_id);
        if (totalPossibleWeight > 0 && weight / totalPossibleWeight > 0.3) {
          risks.push({
            type: 'centralization_risk',
            communityId: community.id,
            communityName: community.name,
            userId: member.user_id,
            ratio: weight / totalPossibleWeight
          });
        }
      }
    }

    return {
      risks,
      memory: {
        ...this.instance?.memory,
        reportedRiskKeys: this.instance?.memory?.reportedRiskKeys || []
      }
    };
  }

  async runReasoning(context) {
    const freshRisks = context.risks.filter(r => {
      const key = `${r.type}:${r.communityId}:${r.proposalId || r.userId}`;
      return !context.memory.reportedRiskKeys.includes(key);
    });

    if (freshRisks.length === 0) return null;

    return {
      actions: freshRisks.map(risk => ({
        type: 'record_risk',
        payload: risk
      }))
    };
  }

  async executeActions(actions, context) {
    const newKeys = [];

    for (const action of actions) {
      if (action.type === 'record_risk') {
        const risk = action.payload;
        let message = '';
        let eventType = '';
        let payload = {};

        if (risk.type === 'participation_risk') {
          message = `Low participation detected for proposal ${risk.proposalId} in ${risk.communityName}. Current rate: ${(risk.rate * 100).toFixed(1)}%`;
          eventType = 'governance.participation_risk';
          payload = { proposalId: risk.proposalId, communityId: risk.communityId, rate: risk.rate };
        } else if (risk.type === 'centralization_risk') {
          message = `High authority concentration detected for user ${risk.userId} in ${risk.communityName}. Holds ${(risk.ratio * 100).toFixed(1)}% of voting weight.`;
          eventType = 'governance.centralization_risk';
          payload = { communityId: risk.communityId, userId: risk.userId, ratio: risk.ratio };
        }

        await this.recordEvent(eventType, {
          ...payload,
          message
        });

        const key = `${risk.type}:${risk.communityId}:${risk.proposalId || risk.userId}`;
        newKeys.push(key);
      }
    }

    // Update memory
    context.memory.reportedRiskKeys = [
      ...context.memory.reportedRiskKeys,
      ...newKeys
    ].slice(-200);
  }
}

export default GovernanceAgent;
