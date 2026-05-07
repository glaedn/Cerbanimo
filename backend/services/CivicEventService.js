import pool from '../db.js';
import EventBusService from './EventBusService.js';

class CivicEventService {
  queryRunner(client = null) {
    return client || pool;
  }

  async recordEvent(event, client = null) {
    const db = this.queryRunner(client);
    const {
      eventType,
      actorId = null,
      entityType,
      entityId = null,
      payload = {},
      causationId = null,
      correlationId = null
    } = event;

    if (!eventType) throw new Error('eventType is required.');
    if (!entityType) throw new Error('entityType is required.');

    const result = await db.query(
      `INSERT INTO civic_events (
         event_type, actor_id, entity_type, entity_id,
         payload, causation_id, correlation_id
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING *`,
      [
        eventType,
        actorId,
        entityType,
        entityId,
        JSON.stringify(payload || {}),
        causationId,
        correlationId
      ]
    );

    const recordedEvent = result?.rows?.length > 0 ? result.rows[0] : { id: null };

    // Publish to event bus
    await EventBusService.publish(eventType, payload, {
      id: recordedEvent.id,
      actorId,
      entityType,
      entityId,
      correlationId,
      causationId: causationId // Preserve the triggering event ID
    });

    return recordedEvent;
  }

  async listEvents(filters = {}) {
    const {
      entityType,
      entityId,
      actorId,
      eventType,
      limit = 50
    } = filters;

    const clauses = [];
    const params = [];
    let paramIndex = 1;

    if (entityType) {
      clauses.push(`entity_type = $${paramIndex++}`);
      params.push(entityType);
    }
    if (entityId) {
      clauses.push(`entity_id = $${paramIndex++}`);
      params.push(entityId);
    }
    if (actorId) {
      clauses.push(`actor_id = $${paramIndex++}`);
      params.push(actorId);
    }
    if (eventType) {
      clauses.push(`event_type = $${paramIndex++}`);
      params.push(eventType);
    }

    params.push(Math.min(Number(limit) || 50, 200));
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT *
       FROM civic_events
       ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    return result.rows;
  }
}

export default new CivicEventService();
