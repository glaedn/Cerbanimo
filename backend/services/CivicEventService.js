import pool from '../db.js';

class CivicEventService {
  queryRunner(client = null) {
    return client || pool;
  }

  async recordEvent(event, client = null) {
    const db = this.queryRunner(client);
    const {
      eventType,
      actorUserId = null,
      subjectType,
      subjectId = null,
      scopeType = null,
      scopeId = null,
      payload = {},
      causationEventId = null,
      correlationId = null
    } = event;

    if (!eventType) throw new Error('eventType is required.');
    if (!subjectType) throw new Error('subjectType is required.');

    const result = await db.query(
      `INSERT INTO civic_events (
         event_type, actor_user_id, subject_type, subject_id, scope_type, scope_id,
         payload, causation_event_id, correlation_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING *`,
      [
        eventType,
        actorUserId,
        subjectType,
        subjectId,
        scopeType,
        scopeId,
        JSON.stringify(payload || {}),
        causationEventId,
        correlationId
      ]
    );

    return result.rows[0];
  }

  async listEvents(filters = {}) {
    const {
      subjectType,
      subjectId,
      actorUserId,
      eventType,
      limit = 50
    } = filters;

    const clauses = [];
    const params = [];
    let paramIndex = 1;

    if (subjectType) {
      clauses.push(`subject_type = $${paramIndex++}`);
      params.push(subjectType);
    }
    if (subjectId) {
      clauses.push(`subject_id = $${paramIndex++}`);
      params.push(subjectId);
    }
    if (actorUserId) {
      clauses.push(`actor_user_id = $${paramIndex++}`);
      params.push(actorUserId);
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
