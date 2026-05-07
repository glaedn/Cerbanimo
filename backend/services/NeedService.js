import pool from '../db.js';
import { findMatchesForNeed } from './matchingService.js';
import { sendNotification } from './NotificationService.js';
import NeedExpansionService from './NeedExpansionService.js';
import IntentEngineService from './IntentEngineService.js';

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

    const result = await pool.query(
      `INSERT INTO needs (name, description, category, quantity_needed, urgency,
                          urgency_level, is_recurring, recurrence_pattern, location, mobility_required,
                          requestor_user_id, requestor_community_id, required_before_date,
                          location_text, latitude, longitude, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        name, description, category, quantity_needed, urgency,
        urgency_level, is_recurring, recurrence_pattern, location, mobility_required,
        requestor_user_id, requestor_community_id, required_before_date,
        location_text, latitude, longitude, status, source
      ]
    );

    let newNeed = result.rows[0];

    const complexityScore = this.calculateComplexityScore(newNeed);
    await pool.query('UPDATE needs SET complexity_score = $1 WHERE id = $2', [complexityScore, newNeed.id]);
    newNeed.complexity_score = complexityScore;

    IntentEngineService.registerNeedCreated(newNeed, user)
      .catch(err => console.error('Civic kernel need registration failed:', err));

    const EXPANSION_THRESHOLD = 2.5;
    if (complexityScore >= EXPANSION_THRESHOLD) {
      NeedExpansionService.expandNeed(newNeed).catch(err => console.error('Need expansion failed:', err));
    } else {
      this.addTaskToNeedsBoard(newNeed).catch(err => console.error('Failed to add need to Needs Board:', err));
    }

    this.processMatches(newNeed).catch(err => console.error('Error processing matches for new need:', err));

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

  async markNeedComplete(needId) {
    const result = await pool.query(
      `UPDATE needs
       SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_via = 'system'
       WHERE id = $1
       RETURNING *`,
      [needId]
    );
    return result.rows[0];
  }

  async processMatches(need) {
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
      }
    }

    await Promise.all(notifications);
  }
}

export default new NeedService();
