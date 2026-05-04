import pool from '../db.js';
import { findMatchesForNeed } from './matchingService.js';
import { sendNotification } from './NotificationService.js';

class NeedService {
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

    const newNeed = result.rows[0];

    // Trigger Matching and Notifications (Non-blocking)
    this.processMatches(newNeed).catch(err => console.error('Error processing matches for new need:', err));

    return newNeed;
  }

  async processMatches(need) {
    const matches = await findMatchesForNeed(need.id, pool);
    const notifications = [];

    // Notify matched users
    for (const user of matches.users) {
      if (user.id === need.requestor_user_id) continue;
      notifications.push(
        sendNotification(user.id, {
          message: `A new need matching your skills has been posted: ${need.name}`,
          type: 'need_match'
        })
      );
    }

    // Notify owners of matched resources
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
