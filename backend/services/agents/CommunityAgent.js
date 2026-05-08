import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';

class CommunityAgent extends BaseAgent {
  constructor(scope) {
    super('CommunityAgent', scope);
  }

  async loadContext() {
    const communityHealth = await pool.query(`
      SELECT c.id, c.name,
             COUNT(DISTINCT n.id) as open_needs,
             COUNT(DISTINCT p.id) as active_projects,
             (SELECT COUNT(*) FROM civic_events ce
              WHERE ce.entity_type = 'community' AND ce.entity_id = c.id
              AND ce.created_at > NOW() - INTERVAL '7 days') as recent_events
      FROM communities c
      LEFT JOIN needs n ON n.requestor_community_id = c.id AND n.status = 'open'
      LEFT JOIN projects p ON p.community_id = c.id AND COALESCE(p.status, 'active') = 'active'
      GROUP BY c.id
      LIMIT 10
    `);

    return {
      communities: communityHealth.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.communities.length === 0) return null;

    const signals = context.communities.map(c => ({
      id: c.id,
      name: c.name,
      openNeeds: c.open_needs,
      activeProjects: c.active_projects,
      activityLevel: c.recent_events
    }));

    const recommendation = await AIGatewayService.synthesizeRecommendation(
      this.type,
      { signals },
      []
    );

    return {
      actions: [
        {
          type: 'recommendation',
          payload: recommendation
        }
      ]
    };
  }

  async executeActions(actions) {
    for (const action of actions) {
      if (action.type === 'recommendation') {
        const rec = action.payload;
        await this.createRecommendation({
          type: rec.recommendationType,
          targetType: rec.targetType || 'community',
          targetId: rec.targetId,
          reasoning: rec.reasoning,
          confidence: rec.confidence
        });

        await this.recordEvent('community.health_analyzed', {
          communityId: rec.targetId,
          recommendation: rec.recommendationType
        }, rec.confidence);
      }
    }
  }
}

export default CommunityAgent;
