import pool from '../db.js';

class ResourceService {
  async addResource(ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, status = 'available', skillIds = [], locationText = '') {
    const query = `
      INSERT INTO resources (owner_user_id, owner_community_id, name, description, category, condition, quantity, unit, status, skill_ids, location_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const result = await pool.query(query, [ownerUserId, ownerCommunityId, name, description, category, condition, quantity, unit, status, skillIds, locationText]);
    return result.rows[0];
  }

  async allocateResource(resourceId, taskId, userId, startTime, endTime) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for conflicts
      const conflictQuery = `
        SELECT id FROM resource_allocations
        WHERE resource_id = $1 AND status != 'cancelled'
        AND (
          (start_time BETWEEN $2 AND $3) OR
          (end_time BETWEEN $2 AND $3) OR
          ($2 BETWEEN start_time AND end_time)
        );
      `;
      const conflictResult = await client.query(conflictQuery, [resourceId, startTime, endTime]);

      if (conflictResult.rows.length > 0) {
        throw new Error('Double-booking detected for this resource.');
      }

      const insertQuery = `
        INSERT INTO resource_allocations (resource_id, task_id, user_id, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, $5, 'reserved')
        RETURNING *;
      `;
      const allocationResult = await client.query(insertQuery, [resourceId, taskId, userId, startTime, endTime]);
      const allocation = allocationResult.rows[0];

      await client.query('COMMIT');
      return allocation;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getResourceInventory(ownerUserId) {
    const query = 'SELECT * FROM resources WHERE owner_user_id = $1';
    const result = await pool.query(query, [ownerUserId]);
    return result.rows;
  }
}

export default new ResourceService();
