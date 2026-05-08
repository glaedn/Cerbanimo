import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';

class MissionAgent extends BaseAgent {
  constructor(scope) {
    super('MissionAgent', scope);
  }

  async loadContext() {
    const stalledMissions = await pool.query(`
      SELECT p.*,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_tasks,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status::text LIKE '%unassigned%') as unassigned_tasks,
             (SELECT MAX(updated_at) FROM tasks t WHERE t.project_id = p.id) as last_activity
      FROM projects p
      WHERE COALESCE(p.status, 'active') = 'active'
      AND p.id IN (
          SELECT project_id FROM tasks
          WHERE updated_at < NOW() - INTERVAL '48 hours'
          GROUP BY project_id
      )
      LIMIT 10
    `);

    return {
      missions: stalledMissions.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.missions.length === 0) return null;

    const signals = context.missions.map(m => ({
      id: m.id,
      name: m.name,
      completionRate: m.total_tasks > 0 ? (m.completed_tasks / m.total_tasks).toFixed(2) : 0,
      unassignedTasks: m.unassigned_tasks,
      lastActivity: m.last_activity
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
          targetType: rec.targetType || 'project',
          targetId: rec.targetId,
          reasoning: rec.reasoning,
          confidence: rec.confidence
        });

        await this.recordEvent('mission.stalled_detected', {
          projectId: rec.targetId,
          recommendation: rec.recommendationType
        }, rec.confidence);
      }
    }
  }
}

export default MissionAgent;
