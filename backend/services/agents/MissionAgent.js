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
      memory: {
        ...this.instance?.memory,
        lastActedAt: this.instance?.memory?.lastActedAt || {}
      }
    };
  }

  async runReasoning(context) {
    const RECHECK_DAYS = 7;
    const freshMissions = context.missions.filter(m => {
      const lastActed = context.memory.lastActedAt?.[`mission:${m.id}`];
      if (!lastActed) return true;
      const daysSince = (Date.now() - new Date(lastActed).getTime()) / 86400000;
      return daysSince > RECHECK_DAYS;
    });

    if (freshMissions.length === 0) return null;

    const signals = freshMissions.map(m => ({
      id: m.id,
      name: m.name,
      completionRate: m.total_tasks > 0 ? (m.completed_tasks / m.total_tasks).toFixed(2) : 0,
      unassignedTasks: m.unassigned_tasks,
      lastActivity: m.last_activity
    }));

    let recommendation;
    try {
      recommendation = await AIGatewayService.synthesizeRecommendation(
        this.type,
        { signals },
        []
      );
    } catch (err) {
      console.warn('MissionAgent: AI synthesis failed, using rule-based fallback', err.message);
      recommendation = this.ruleBasedRecommendation(freshMissions[0]);
    }

    return {
      actions: [
        {
          type: 'recommendation',
          payload: recommendation
        }
      ]
    };
  }

  ruleBasedRecommendation(mission) {
    return {
      recommendationType: mission.unassigned_tasks > 0 ? 'recruit_contributors' : 'review_stalled_mission',
      targetId: mission.id,
      targetType: 'project',
      reasoning: { summary: 'Rule-based: mission stalled >48h', evidence: [] },
      confidence: 0.6
    };
  }

  async executeActions(actions, context) {
    const now = new Date().toISOString();

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

        if (rec.targetId) {
          context.memory.lastActedAt[`mission:${rec.targetId}`] = now;
        }
      }
    }

    // Optional: Prune old entries from memory to keep it lean
    const PRUNE_THRESHOLD_DAYS = 30;
    for (const key in context.memory.lastActedAt) {
      const daysSince = (Date.now() - new Date(context.memory.lastActedAt[key]).getTime()) / 86400000;
      if (daysSince > PRUNE_THRESHOLD_DAYS) {
        delete context.memory.lastActedAt[key];
      }
    }
  }
}

export default MissionAgent;
