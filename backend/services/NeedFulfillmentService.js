import pool from '../db.js';
import NeedService from './NeedService.js';
import CivicEventService from './CivicEventService.js';

class NeedFulfillmentService {
  async createFulfillment(data, userId) {
    const { needId, providerCommunityId, resourceId, fulfillmentPercentage, notes } = data;

    const query = `
      INSERT INTO need_fulfillments (
        need_id, provider_user_id, provider_community_id, resource_id, fulfillment_percentage, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    const result = await pool.query(query, [
      needId, userId, providerCommunityId, resourceId, fulfillmentPercentage, notes
    ]);

    const fulfillment = result.rows[0];

    // Record event
    await CivicEventService.recordEvent({
      eventType: 'need.fulfillment_created',
      actorId: userId,
      entityType: 'need_fulfillment',
      entityId: fulfillment.id,
      payload: {
        needId,
        fulfillmentPercentage
      },
      correlationId: `need:${needId}`
    });

    return fulfillment;
  }

  async verifyFulfillment(fulfillmentId, verifierId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fullRes = await client.query(`
        SELECT nf.*, n.requestor_user_id, n.requestor_community_id
        FROM need_fulfillments nf
        JOIN needs n ON nf.need_id = n.id
        WHERE nf.id = $1 FOR UPDATE
      `, [fulfillmentId]);
      if (fullRes.rows.length === 0) throw new Error('Fulfillment not found');
      const fulfillment = fullRes.rows[0];

      if (fulfillment.status !== 'pending') {
        throw new Error('Fulfillment is already processed');
      }

      // Authorization: Verifier must be the requestor or an admin of the requesting community
      let authorized = false;
      if (fulfillment.requestor_user_id === verifierId) {
        authorized = true;
      } else if (fulfillment.requestor_community_id) {
        const adminCheck = await client.query(
          "SELECT 1 FROM communities WHERE id = $1 AND $2 = ANY(members) AND EXISTS (SELECT 1 FROM users WHERE id = $2 AND roles @> '{admin}')",
          [fulfillment.requestor_community_id, verifierId]
        );
        if (adminCheck.rows.length > 0) authorized = true;
      }

      if (!authorized) {
        throw new Error('Unauthorized: Only the need requestor or community admin can verify fulfillment');
      }

      await client.query(
        "UPDATE need_fulfillments SET status = 'verified' WHERE id = $1",
        [fulfillmentId]
      );

      // Check if need is now fully met
      const totalFulfillmentRes = await client.query(
        "SELECT SUM(fulfillment_percentage) as total FROM need_fulfillments WHERE need_id = $1 AND status IN ('verified', 'completed')",
        [fulfillment.need_id]
      );
      const total = parseFloat(totalFulfillmentRes.rows[0].total || 0);

      if (total >= 100) {
        await client.query(
          "UPDATE needs SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_via = 'partial_contributions' WHERE id = $1",
          [fulfillment.need_id]
        );

        // Mark all verified fulfillments for this need as completed
        await client.query(
          "UPDATE need_fulfillments SET status = 'completed' WHERE need_id = $1 AND status = 'verified'",
          [fulfillment.need_id]
        );
      }

      await client.query('COMMIT');
      return { success: true, totalFulfillment: total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getFulfillmentsForNeed(needId) {
    const result = await pool.query(
      'SELECT * FROM need_fulfillments WHERE need_id = $1 ORDER BY created_at DESC',
      [needId]
    );
    return result.rows;
  }
}

export default new NeedFulfillmentService();
