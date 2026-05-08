import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class ConstitutionalAgent extends BaseAgent {
  constructor() {
    super('ConstitutionalAgent', 'system', 0);
  }

  async process() {
     await this.detectGovernanceDrift();
  }

  async detectGovernanceDrift() {
     const query = `
       SELECT c.id, c.name, con.content as constitution, c.governance_config
       FROM communities c
       JOIN constitutions con ON c.active_constitution_id = con.id
     `;
     const result = await pool.query(query);

     for (const community of result.rows) {
        // Compare actual config with constitutional principles (simplified)
        const principles = community.constitution?.governance?.principles || [];
        if (principles.includes('decentralization') && community.governance_config.votingModel === 'direct' && (community.governance_config.quorum || 0) < 0.05) {
            await this.logEvent(`Governance drift detected in ${community.name}: Quorum too low for stated decentralization goals.`, {
               communityId: community.id,
               type: 'constitutional_risk'
            });
        }
     }
  }
}

export default new ConstitutionalAgent();
