import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';

class UserGrowthAgent extends BaseAgent {
  constructor(scope) {
    super('UserGrowthAgent', scope);
  }

  async loadContext() {
    // Look for users who have completed multiple tasks recently but haven't expanded their skill set or taken on mentors
    const activeUsers = await pool.query(`
      SELECT u.id, u.email,
             COUNT(t.id) as tasks_completed,
             array_agg(DISTINCT t.impact_label) as skills_used
      FROM users u
      JOIN tasks t ON t.assigned_to = u.id
      WHERE t.status = 'completed'
      AND t.updated_at > NOW() - INTERVAL '30 days'
      GROUP BY u.id
      HAVING COUNT(t.id) >= 3
      LIMIT 10
    `);

    return {
      users: activeUsers.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.users.length === 0) return null;

    const signals = context.users.map(u => ({
      id: u.id,
      tasksCompleted: u.tasks_completed,
      skillsUsed: u.skills_used
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
          targetType: rec.targetType || 'user',
          targetId: rec.targetId,
          reasoning: rec.reasoning,
          confidence: rec.confidence
        });

        await this.recordEvent('user.growth_path_identified', {
          userId: rec.targetId,
          recommendation: rec.recommendationType
        }, rec.confidence);
      }
    }
  }
}

export default UserGrowthAgent;
