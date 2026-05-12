import pool from '../db.js';
import { findMatchesForNeed } from './matchingService.js';
import { sendNotification } from './NotificationService.js';
import NeedExpansionService from './NeedExpansionService.js';
import IntentEngineService from './IntentEngineService.js';
import CivicEventService from './CivicEventService.js';

class NeedService {
  calculateComplexityScore(need) {
    let score = 0;

    if (need.description?.length > 200) score += 1;
    if (need.description?.length > 500) score += 1;

    if (need.skill_ids?.length >= 2) score += 1;
    if (need.skill_ids?.length >= 4) score += 1;

    if (need.location || need.location_text) score += 0.5;
    const urgency = (need.urgency_level || need.urgency || '').toLowerCase();
    if (urgency === 'high' || urgency === 'critical') score += 1;

    return score;
  }

  async getOrCreateNeedsBoardProject() {
    const boardName = 'Needs Board';
    const result = await pool.query('SELECT * FROM projects WHERE name = $1 LIMIT 1', [boardName]);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const adminResult = await pool.query("SELECT id FROM users WHERE roles @> '{admin}' LIMIT 1");
    const creatorId = adminResult.rows[0]?.id || 1;

    const insertResult = await pool.query(
      `INSERT INTO projects (name, description, creator_id, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [boardName, 'A collection of community needs that require quick action.', creatorId, ['Mutual Aid']]
    );
    return insertResult.rows[0];
  }

  async createNeed(data, user = null) {
    let {
      name,
      description,
      category,
      quantity_needed,
      urgency,
      urgency_level,
      is_recurring,
      recurrence_pattern,
      location,
      mobility_required,
      requestor_user_id,
      requestor_community_id,
      required_before_date,
      location_text,
      latitude,
      longitude,
      status = 'open',
      source = 'web'
    } = data;

    if (!name) throw new Error('Need name is required.');

    if (!requestor_user_id && !requestor_community_id && user) {
        requestor_user_id = user.id;
    }

    if (!requestor_user_id && !requestor_community_id) {
      throw new Error('Either requestor_user_id or requestor_community_id must be provided.');
    }

    // Spatial Fallback Logic
    let finalLat = latitude;
    let finalLon = longitude;

    if (!finalLat || !finalLon) {
      if (requestor_user_id) {
        const userRes = await pool.query(
          'SELECT ST_Y(location_point::geometry) as lat, ST_X(location_point::geometry) as lon FROM users WHERE id = $1',
          [requestor_user_id]
        );
        if (userRes.rows.length > 0 && userRes.rows[0].lat && userRes.rows[0].lon) {
          finalLat = userRes.rows[0].lat;
          finalLon = userRes.rows[0].lon;
        }
      }
    }

    const result = await pool.query(
      `INSERT INTO needs (name, description, category, quantity_needed, urgency,
                          urgency_level, is_recurring, recurrence_pattern, location, mobility_required,
                          requestor_user_id, requestor_community_id, required_before_date,
                          location_text, latitude, longitude, status, source, location_point)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
               CASE
                 WHEN $15::numeric IS NOT NULL AND $16::numeric IS NOT NULL
                 THEN ST_SetSRID(ST_MakePoint($16::numeric, $15::numeric), 4326)::geography
                 ELSE NULL
               END)
       RETURNING *`,
      [
        name, description, category, quantity_needed, urgency,
        urgency_level, is_recurring, recurrence_pattern, location, mobility_required,
        requestor_user_id, requestor_community_id, required_before_date,
        location_text, finalLat, finalLon, status, source
      ]
    );

    let newNeed = result.rows[0];

    const complexityScore = this.calculateComplexityScore(newNeed);
    await pool.query('UPDATE needs SET complexity_score = $1 WHERE id = $2', [complexityScore, newNeed.id]);
    newNeed.complexity_score = complexityScore;

    // Transformation: Moving from direct service coupling to event-driven
    // IntentEngineService.registerNeedCreated(newNeed, user)
    //   .catch(err => console.error('Civic kernel need registration failed:', err));

    // Instead, we record a civic event, which will trigger the EventRouter
    CivicEventService.recordEvent({
      eventType: 'need.created',
      actorId: user?.id || newNeed.requestor_user_id,
      entityType: 'need',
      entityId: newNeed.id,
      payload: {
        name: newNeed.name,
        complexityScore: newNeed.complexity_score,
        urgency: newNeed.urgency,
        category: newNeed.category
      },
      correlationId: `need:${newNeed.id}`
    }).catch(err => console.error('Failed to record need.created event:', err));

    // Transformation: Moving from direct service coupling to event-driven
    // Matches will be processed by the EventRouter or background workers
    // this.processMatches(newNeed).catch(err => console.error('Error processing matches for new need:', err));

    return newNeed;
  }

  async addTaskToNeedsBoard(need) {
    const board = await this.getOrCreateNeedsBoardProject();
    const insertTaskQuery = `
      INSERT INTO tasks (name, description, project_id, status, reward_tokens, related_need_id, skill_id)
      VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM skills WHERE name = $7 LIMIT 1))
      RETURNING *
    `;
    return pool.query(insertTaskQuery, [
      need.name,
      need.description,
      board.id,
      'unassigned',
      20,
      need.id,
      need.category || 'General'
    ]);
  }

  async markNeedComplete(needId, causationId = null) {
    const result = await pool.query(
      `UPDATE needs
       SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_via = 'system'
       WHERE id = $1
       RETURNING *`,
      [needId]
    );
    return result.rows[0];
  }

  async processMatches(need, causationId = null) {
    const matches = await findMatchesForNeed(need.id, pool);
    const notifications = [];

    for (const user of matches.users) {
      if (user.id === need.requestor_user_id) continue;
      notifications.push(
        sendNotification(user.id, {
          message: `A new need matching your skills has been posted: ${need.name}`,
          type: 'need_match'
        })
      );
    }

    for (const resource of matches.resources) {
      if (resource.owner_user_id && resource.owner_user_id !== need.requestor_user_id) {
        notifications.push(
          sendNotification(resource.owner_user_id, {
            message: `A new need matching your resource "${resource.name}" has been posted: ${need.name}`,
            type: 'resource_match'
          })
        );

        // Record resource matching event
        CivicEventService.recordEvent({
          eventType: 'resource.matched',
          actorId: resource.owner_user_id,
          entityType: 'resource',
          entityId: resource.id,
          payload: {
            needId: need.id,
            matchScore: resource.match_score
          },
          correlationId: `need:${need.id}`,
          causationId
        }).catch(err => console.error('Failed to record resource.matched event:', err));
      }
    }

    await Promise.all(notifications);
  }
}

export default new NeedService();
