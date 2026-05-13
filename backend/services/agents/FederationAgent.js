import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';

class FederationAgent extends BaseAgent {
  constructor(scope = { type: 'system', id: null }) {
    super('FederationAgent', scope);
  }

  async loadContext() {
    // Find communities with complementary needs and resources
    const query = `
      SELECT c1.id as c1_id, c2.id as c2_id, c1.name as c1_name, c2.name as c2_name, c1.interest_tags as c1_tags, c2.interest_tags as c2_tags
      FROM communities c1, communities c2
      WHERE c1.id < c2.id
      AND c1.interest_tags && c2.interest_tags
    `;
    const result = await pool.query(query);

    return {
      pairs: result.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    const actions = [];

    for (const pair of context.pairs) {
      const actionKey = `federation_recommendation:${pair.c1_id}:${pair.c2_id}`;
      // Note: checkCooldown needs this.instance.id, which is available after ensureInstance in processCycle
      actions.push({
        type: 'evaluate_pair',
        payload: { pair, actionKey }
      });
    }

    return { actions };
  }

  async executeActions(actions) {
    for (const action of actions) {
      if (action.type === 'evaluate_pair') {
        const { pair, actionKey } = action.payload;

        if (await this.checkCooldown(actionKey, 168)) { // 1 week cooldown for the same pair
          const sharedTagIds = pair.c1_tags.filter(t => pair.c2_tags.includes(t));

          // Resolve tag names
          let sharedTagNames = [];
          if (sharedTagIds.length > 0) {
            const tagRes = await pool.query('SELECT name FROM interests WHERE id = ANY($1)', [sharedTagIds]);
            sharedTagNames = tagRes.rows.map(r => r.name);
          }

          // Simple heuristic: shared interest tags suggest potential for treaty
          await this.createRecommendation({
            type: 'federation_treaty',
            targetType: 'community',
            targetId: pair.c1_id,
            reasoning: {
              description: `Potential mutual aid opportunity detected between "${pair.c1_name}" and "${pair.c2_name}" based on shared interests: ${sharedTagNames.join(', ') || 'shared goals'}.`,
              otherCommunityId: pair.c2_id,
              sharedTags: sharedTagNames
            },
            confidence: 0.7
          });

          await this.recordEvent(actionKey, {
            communityA: pair.c1_id,
            communityB: pair.c2_id,
            type: 'federation_recommendation'
          });
        }
      }
    }
  }
}

export default FederationAgent;
