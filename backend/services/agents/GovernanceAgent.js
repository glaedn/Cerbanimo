import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class GovernanceAgent extends BaseAgent {
  constructor(scope = { type: 'system', id: null }) {
    super('GovernanceAgent', scope);
  }

  async loadContext() {
    const risks = [];

    // 1. Batched Participation Risk Analysis
    const participationQuery = `
      SELECT
          p.id as proposal_id,
          p.community_id,
          c.name as community_name,
          COUNT(v.id) as participation_count,
          COALESCE(array_length(c.members, 1), 1) as member_count,
          CAST(COUNT(v.id) AS FLOAT) / NULLIF(COALESCE(array_length(c.members, 1), 1), 0) as participation_rate,
          COALESCE((c.governance_config->>'quorum')::float, 0.1) as quorum
      FROM proposals p
      JOIN communities c ON c.id = p.community_id
      LEFT JOIN votes v ON v.proposal_id = p.id
      WHERE p.status IN ('deliberation', 'voting')
      GROUP BY p.id, c.id, c.name, c.members, c.governance_config
      HAVING CAST(COUNT(v.id) AS FLOAT) / NULLIF(COALESCE(array_length(c.members, 1), 1), 0) < COALESCE((c.governance_config->>'quorum')::float, 0.1)
    `;
    const participationRes = await pool.query(participationQuery);
    for (const row of participationRes.rows) {
      risks.push({
        type: 'participation_risk',
        communityId: row.community_id,
        communityName: row.community_name,
        proposalId: row.proposal_id,
        rate: row.participation_rate
      });
    }

    // 2. Batched Authority Concentration (Centralization Risk)
    const concentrationQuery = `
      WITH user_community_tokens AS (
          SELECT
              u.id as user_id,
              (token_entry->>'id')::int as community_id,
              SUM((token_entry->>'tokens')::numeric) as tokens
          FROM users u,
          LATERAL unnest(u.token_ledger) as token_entry
          WHERE (token_entry->>'type' IN ('community', 'community_task_reward', 'community_task_bonus'))
            AND COALESCE(token_entry->>'mode', 'earn') IN ('earn', 'receive')
          GROUP BY u.id, community_id
      ),
      community_totals AS (
          SELECT
              community_id,
              SUM(tokens) as total_tokens
          FROM user_community_tokens
          GROUP BY community_id
      ),
      active_delegations AS (
          SELECT delegator_id, delegate_id
          FROM delegations
          WHERE (expires_at IS NULL OR expires_at > NOW())
      ),
      member_weights AS (
          SELECT
              c.id as community_id,
              u.id as user_id,
              COALESCE(
                  (SELECT uct.tokens FROM user_community_tokens uct WHERE uct.user_id = u.id AND uct.community_id = c.id),
                  0
              ) + COALESCE((
                  SELECT SUM(uct2.tokens)
                  FROM active_delegations d
                  JOIN user_community_tokens uct2 ON uct2.user_id = d.delegator_id AND uct2.community_id = c.id
                  WHERE d.delegate_id = u.id
              ), 0) as weight
          FROM communities c
          CROSS JOIN LATERAL unnest(c.members) as m_id
          JOIN users u ON u.id = m_id
      )
      SELECT
          mw.community_id,
          c.name as community_name,
          mw.user_id,
          CASE
            WHEN mw.weight = 0 THEN 1.0 / NULLIF(COALESCE(NULLIF(ct.total_tokens, 0), array_length(c.members, 1), 1), 0)
            ELSE mw.weight / NULLIF(COALESCE(NULLIF(ct.total_tokens, 0), array_length(c.members, 1), 1), 0)
          END as ratio
      FROM member_weights mw
      JOIN communities c ON c.id = mw.community_id
      LEFT JOIN community_totals ct ON ct.community_id = mw.community_id
      WHERE (CASE
            WHEN mw.weight = 0 THEN 1.0 / NULLIF(COALESCE(NULLIF(ct.total_tokens, 0), array_length(c.members, 1), 1), 0)
            ELSE mw.weight / NULLIF(COALESCE(NULLIF(ct.total_tokens, 0), array_length(c.members, 1), 1), 0)
          END) > 0.3
    `;
    const concentrationRes = await pool.query(concentrationQuery);
    for (const row of concentrationRes.rows) {
      risks.push({
        type: 'centralization_risk',
        communityId: row.community_id,
        communityName: row.community_name,
        userId: row.user_id,
        ratio: row.ratio
      });
    }

    return {
      risks,
      memory: {
        ...this.instance?.memory,
        lastActedAt: this.instance?.memory?.lastActedAt || {}
      }
    };
  }

  async runReasoning(context) {
    const RECHECK_DAYS = 3;
    const freshRisks = context.risks.filter(r => {
      const key = `${r.type}:${r.communityId}:${r.proposalId || r.userId}`;
      const lastActed = context.memory.lastActedAt?.[key];
      if (!lastActed) return true;
      const daysSince = (Date.now() - new Date(lastActed).getTime()) / 86400000;
      return daysSince > RECHECK_DAYS;
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
    const now = new Date().toISOString();

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
        context.memory.lastActedAt[key] = now;
      }
    }

    // Prune old entries
    const PRUNE_THRESHOLD_DAYS = 30;
    for (const key in context.memory.lastActedAt) {
      const daysSince = (Date.now() - new Date(context.memory.lastActedAt[key]).getTime()) / 86400000;
      if (daysSince > PRUNE_THRESHOLD_DAYS) {
        delete context.memory.lastActedAt[key];
      }
    }
  }
}

export default GovernanceAgent;
