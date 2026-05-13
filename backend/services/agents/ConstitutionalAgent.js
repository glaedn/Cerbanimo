import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class ConstitutionalAgent extends BaseAgent {
  constructor(scope = { type: 'system', id: null }) {
    super('ConstitutionalAgent', scope);
  }

  async loadContext() {
    const query = `
      SELECT c.id, c.name, con.content as constitution, c.governance_config
      FROM communities c
      JOIN constitutions con ON c.active_constitution_id = con.id
    `;
    const result = await pool.query(query);

    const drifts = [];
    for (const community of result.rows) {
      // Compare actual config with constitutional principles (simplified)
      const principles = community.constitution?.governance?.principles || [];
      if (principles.includes('decentralization') && community.governance_config.votingModel === 'direct' && (community.governance_config.quorum || 0) < 0.05) {
        drifts.push({
          communityId: community.id,
          communityName: community.name,
          type: 'constitutional_risk',
          reason: 'Quorum too low for stated decentralization goals.'
        });
      }
    }

    return {
      drifts,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.drifts.length === 0) return null;

    return {
      actions: context.drifts.map(drift => ({
        type: 'record_drift',
        payload: drift
      }))
    };
  }

  async executeActions(actions) {
    for (const action of actions) {
      if (action.type === 'record_drift') {
        const drift = action.payload;
        await this.recordEvent('governance.constitutional_drift', {
          communityId: drift.communityId,
          message: `Governance drift detected in ${drift.communityName}: ${drift.reason}`,
          type: drift.type
        });
      }
    }
  }
}

export default ConstitutionalAgent;
