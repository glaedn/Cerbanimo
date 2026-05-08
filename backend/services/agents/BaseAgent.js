import pool from '../../db.js';
import AIGatewayService from '../AIGatewayService.js';
import CivicEventService from '../CivicEventService.js';

class BaseAgent {
  constructor(type, scope = { type: 'global', id: null }) {
    this.type = type;
    this.scope = scope;
    this.instance = null;
  }

  async ensureInstance() {
    const result = await pool.query(
      `INSERT INTO agent_instances (type, scope_type, scope_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (type, scope_type, scope_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [this.type, this.scope.type, this.scope.id]
    );
    this.instance = result.rows[0];
    return this.instance;
  }

  // To be implemented by subclasses
  async loadContext() {
    throw new Error('loadContext() must be implemented by subclass');
  }

  async runReasoning(context) {
    throw new Error('runReasoning() must be implemented by subclass');
  }

  async executeActions(actions) {
    throw new Error('executeActions() must be implemented by subclass');
  }

  async recordEvent(eventType, payload, confidence = 1.0) {
    await pool.query(
      `INSERT INTO agent_events (agent_id, event_type, payload, confidence)
       VALUES ($1, $2, $3, $4)`,
      [this.instance.id, eventType, JSON.stringify(payload), confidence]
    );

    // Also record as a broad civic event for the timeline
    await CivicEventService.recordEvent({
      eventType: `agent.${this.type}.${eventType}`,
      actorId: null, // Agents aren't users
      entityType: 'agent',
      entityId: this.instance.id,
      payload: { ...payload, confidence }
    });
  }

  async createRecommendation(rec) {
    const { type, targetType, targetId, reasoning, confidence } = rec;
    await pool.query(
      `INSERT INTO agent_recommendations (agent_id, recommendation_type, target_type, target_id, reasoning)
       VALUES ($1, $2, $3, $4, $5)`,
      [this.instance.id, type, targetType, targetId, JSON.stringify({ ...reasoning, confidence })]
    );
  }

  async checkCooldown(actionKey, durationHours = 6) {
    const result = await pool.query(
      `SELECT created_at FROM agent_events
       WHERE agent_id = $1 AND event_type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [this.instance.id, actionKey]
    );

    if (result.rows.length === 0) return true;

    const lastRun = new Date(result.rows[0].created_at).getTime();
    const now = Date.now();
    return (now - lastRun) > (durationHours * 60 * 60 * 1000);
  }

  async processCycle() {
    await this.ensureInstance();
    console.log(`Agent ${this.type} starting cycle...`);

    const context = await this.loadContext();
    const reasoning = await this.runReasoning(context);

    if (reasoning && reasoning.actions) {
      await this.executeActions(reasoning.actions);
    }

    await pool.query(
      `UPDATE agent_instances SET last_run_at = NOW(), memory = $1 WHERE id = $2`,
      [JSON.stringify(context.memory || {}), this.instance.id]
    );
  }
}

export default BaseAgent;
