import pool from '../db.js';
import { findMatchesForNeed } from './matchingService.js';
import { sendNotification } from './NotificationService.js';
import ProjectConversionService from './ProjectConversionService.js';

class EscalationService {
  async checkAndEscalateNeeds() {
    console.log('Running escalation check for unmet needs...');
    try {
      // Find open needs older than 24 hours that are not yet escalating
      const staleNeedsQuery = `
        SELECT * FROM needs
        WHERE status = 'open'
        AND created_at < NOW() - INTERVAL '24 hours'
      `;
      const result = await pool.query(staleNeedsQuery);
      const needs = result.rows;

      for (const need of needs) {
        await this.escalateNeed(need);
      }

      console.log(`Escalation check complete. Processed ${needs.length} needs.`);
    } catch (err) {
      console.error('Error during escalation check:', err);
    }
  }

  async escalateNeed(need) {
    console.log(`Escalating need: ${need.id} - ${need.name}`);

    try {
      // 1. Update status to 'escalating'
      await pool.query('UPDATE needs SET status = $1 WHERE id = $2', ['escalating', need.id]);

      // 2. Expand search - increase radius to 150km
      const matches = await findMatchesForNeed(need.id, pool, 150);
      const notifications = [];

      // Notify matched users again
      for (const user of matches.users) {
         if (user.id === need.requestor_user_id) continue;
         notifications.push(
           sendNotification(user.id, {
             message: `URGENT: A need matching your skills remains unmet: ${need.name}. Can you help?`,
             type: 'need_escalation'
           })
         );
      }

      // If it's a community need, notify community admins
      if (need.requestor_community_id) {
        const adminsResult = await pool.query(
          "SELECT id FROM users WHERE roles @> '{admin}'"
        );
        for (const admin of adminsResult.rows) {
           notifications.push(
             sendNotification(admin.id, {
               message: `Community need "${need.name}" is escalating and requires attention.`,
               type: 'community_alert'
             })
           );
        }
      }

      await Promise.all(notifications);

      // 3. Auto-convert if high urgency
      const urgency = (need.urgency_level || need.urgency || '').toLowerCase();
      if (urgency === 'high' || urgency === 'critical') {
        console.log(`Auto-converting high-urgency need ${need.id} to project...`);
        await ProjectConversionService.convertNeedToProject(need.id);
      }

    } catch (err) {
      console.error(`Failed to escalate need ${need.id}:`, err);
    }
  }
}

export default new EscalationService();
