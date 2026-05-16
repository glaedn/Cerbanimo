import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';
import SpatialQueryService from '../SpatialQueryService.js';

class NeedAgent extends BaseAgent {
  constructor(scope) {
    super('NeedAgent', scope);
  }

  async loadContext() {
    const unresolvedNeeds = await pool.query(`
      SELECT n.*,
             ST_Y(n.location_point::geometry) as lat,
             ST_X(n.location_point::geometry) as lon,
             (SELECT COUNT(*) FROM tasks t WHERE t.related_need_id = n.id) as task_count,
             (SELECT COUNT(*) FROM need_comments nc WHERE nc.need_id = n.id AND nc.comment_text LIKE '[OFFER]%') as offer_count
      FROM needs n
      WHERE n.status IN ('open', 'in_progress')
      AND (n.required_before_date < NOW() + INTERVAL '3 days' OR n.urgency IN ('high', 'critical'))
      LIMIT 20
    `);

    const needsWithSpatialContext = await Promise.all(unresolvedNeeds.rows.map(async (need) => {
      let spatialContext = {};
      if (need.lat && need.lon) {
        const nearbyResponders = await SpatialQueryService.findNearbyCapability(need.lat, need.lon, 10000);
        const desertStats = await SpatialQueryService.detectResourceDeserts(need.lat, need.lon, 5000);
        spatialContext = { nearbyRespondersCount: nearbyResponders.length, isDesert: desertStats.isDesert };
      }
      return { ...need, spatialContext };
    }));

    return {
      needs: needsWithSpatialContext,
      memory: {
        ...this.instance?.memory,
        processedNeedIds: this.instance?.memory?.processedNeedIds || []
      }
    };
  }

  async runReasoning(context) {
    const freshNeeds = context.needs.filter(n => !context.memory.processedNeedIds.includes(n.id));
    if (freshNeeds.length === 0) return null;

    const signals = freshNeeds.map(n => ({
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

  async executeActions(actions, context) {
    const actedNeedIds = [];

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

        if (rec.targetId) {
          actedNeedIds.push(rec.targetId);
        }
      }
    }

    // Update memory
    context.memory.processedNeedIds = [
      ...context.memory.processedNeedIds,
      ...actedNeedIds
    ].slice(-100); // Keep last 100
  }
}

export default NeedAgent;
