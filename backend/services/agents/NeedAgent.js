import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';

class NeedAgent extends BaseAgent {
  constructor(scope) {
    super('NeedAgent', scope);
  }

  async loadContext() {
    const unresolvedNeeds = await pool.query(`
      SELECT n.*,
             (SELECT COUNT(*) FROM tasks t WHERE t.related_need_id = n.id) as task_count,
             (SELECT COUNT(*) FROM need_comments nc WHERE nc.need_id = n.id AND nc.comment_text LIKE '[OFFER]%') as offer_count
      FROM needs n
      WHERE n.status IN ('open', 'in_progress')
      AND (n.required_before_date < NOW() + INTERVAL '3 days' OR n.urgency IN ('high', 'critical'))
      LIMIT 20
    `);

    return {
      needs: unresolvedNeeds.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.needs.length === 0) return null;

    const signals = context.needs.map(n => ({
      id: n.id,
      name: n.name,
      urgency: n.urgency,
      taskCount: n.task_count,
      offerCount: n.offer_count,
      daysRemaining: n.required_before_date ? Math.round((new Date(n.required_before_date) - Date.now()) / (1000*60*60*24)) : 'N/A'
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
          targetType: rec.targetType || 'need',
          targetId: rec.targetId,
          reasoning: rec.reasoning,
          confidence: rec.confidence
        });

        await this.recordEvent('need.analyzed', {
          needId: rec.targetId,
          recommendation: rec.recommendationType
        }, rec.confidence);
      }
    }
  }
}

export default NeedAgent;
