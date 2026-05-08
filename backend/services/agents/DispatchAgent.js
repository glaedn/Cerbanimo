import BaseAgent from './BaseAgent.js';
import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';
import LogisticsService from '../LogisticsService.js';

class DispatchAgent extends BaseAgent {
  constructor(scope) {
    super('DispatchAgent', scope);
  }

  async loadContext() {
    const activeRoutes = await pool.query(`
      SELECT dr.*, u.username
      FROM dispatch_routes dr
      LEFT JOIN users u ON dr.assigned_user_id = u.id
      WHERE dr.status = 'active'
    `);

    const pendingLogisticsNeeds = await pool.query(`
      SELECT n.*, ST_Y(n.location_point::geometry) as lat, ST_X(n.location_point::geometry) as lon
      FROM needs n
      WHERE n.status = 'open' AND n.category = 'logistics'
      LIMIT 10
    `);

    return {
      activeRoutes: activeRoutes.rows,
      pendingLogistics: pendingLogisticsNeeds.rows,
      memory: this.instance?.memory || {}
    };
  }

  async runReasoning(context) {
    if (context.activeRoutes.length === 0 && context.pendingLogistics.length === 0) return null;

    const signals = {
      activeRoutesCount: context.activeRoutes.length,
      pendingLogisticsCount: context.pendingLogistics.length,
      routes: context.activeRoutes.map(r => ({ id: r.id, user: r.username, status: r.status })),
      needs: context.pendingLogistics.map(n => ({ id: n.id, name: n.name, urgency: n.urgency }))
    };

    const recommendation = await AIGatewayService.synthesizeRecommendation(
      this.type,
      { signals },
      ["Monitor delivery chains", "Optimize dispatch assignments", "Identify transport bottlenecks"]
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
          targetType: rec.targetType || 'dispatch',
          targetId: rec.targetId,
          reasoning: rec.reasoning,
          confidence: rec.confidence
        });

        await this.recordEvent('dispatch.analyzed', {
          routeCount: actions.length,
          recommendation: rec.recommendationType
        }, rec.confidence);
      }
    }
  }
}

export default DispatchAgent;
