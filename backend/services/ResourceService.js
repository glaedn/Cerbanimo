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

      // 1. Create the new allocation as 'reserved'
      const insertQuery = `
        INSERT INTO resource_allocations (resource_id, task_id, user_id, start_time, end_time, status)
        VALUES ($1, $2, $3, $4, $5, 'reserved')
        RETURNING *;
      `;
      const allocationResult = await client.query(insertQuery, [resourceId, taskId, userId, startTime, endTime]);
      const newAllocation = allocationResult.rows[0];

      // 2. Find overlapping allocations (excluding itself)
      const overlapQuery = `
        SELECT id FROM resource_allocations
        WHERE resource_id = $1 AND id != $2 AND status NOT IN ('cancelled', 'completed')
        AND (
          (start_time, end_time) OVERLAPS ($3, $4)
        );
      `;
      const overlapResult = await client.query(overlapQuery, [resourceId, newAllocation.id, startTime, endTime]);

      // 3. Record conflicts for overlaps
      for (const overlap of overlapResult.rows) {
        await client.query(
          `INSERT INTO resource_conflicts (resource_id, allocation_id_1, allocation_id_2, conflict_type, status)
           VALUES ($1, $2, $3, 'double_booking', 'open')`,
          [resourceId, overlap.id, newAllocation.id]
        );
      }

      await client.query('COMMIT');
      return { allocation: newAllocation, conflictCount: overlapResult.rows.length };
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

  async completeAllocations(taskId) {
    const query = `
      UPDATE resource_allocations
      SET status = 'completed'
      WHERE task_id = $1 AND status = 'allocated'
      RETURNING *;
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  async getAllocationsForTask(taskId) {
    const query = `
      SELECT ra.*, r.name as resource_name, r.category
      FROM resource_allocations ra
      JOIN resources r ON ra.resource_id = r.id
      WHERE ra.task_id = $1;
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows;
  }

  async getAllResources(filters = {}) {
    let query = 'SELECT * FROM resources WHERE status = \'available\'';
    const params = [];

    if (filters.category) {
      params.push(filters.category);
      query += ` AND category = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getBookingSchedule(userId) {
    // Resources owned by user and their allocations
    const query = `
      SELECT ra.*, r.name as resource_name, t.name as task_name, u.name as requester_name
      FROM resource_allocations ra
      JOIN resources r ON ra.resource_id = r.id
      LEFT JOIN tasks t ON ra.task_id = t.id
      LEFT JOIN users u ON ra.user_id = u.id
      WHERE r.owner_user_id = $1 OR ra.user_id = $1
      ORDER BY ra.start_time ASC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getConflicts(userId) {
    const query = `
      SELECT rc.*, r.name as resource_name,
             ra1.start_time as start_1, ra1.end_time as end_1,
             ra2.start_time as start_2, ra2.end_time as end_2
      FROM resource_conflicts rc
      JOIN resources r ON rc.resource_id = r.id
      JOIN resource_allocations ra1 ON rc.allocation_id_1 = ra1.id
      JOIN resource_allocations ra2 ON rc.allocation_id_2 = ra2.id
      WHERE r.owner_user_id = $1 AND rc.status = 'open';
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async resolveConflict(conflictId, winningAllocationId, resolutionText) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const conflictRes = await client.query('SELECT * FROM resource_conflicts WHERE id = $1', [conflictId]);
      if (conflictRes.rows.length === 0) throw new Error('Conflict not found');
      const conflict = conflictRes.rows[0];

      const losingAllocationId = conflict.allocation_id_1 === winningAllocationId ? conflict.allocation_id_2 : conflict.allocation_id_1;

      // Update winning allocation to 'allocated' (from reserved)
      await client.query('UPDATE resource_allocations SET status = \'allocated\' WHERE id = $1', [winningAllocationId]);

      // Update losing allocation to 'cancelled'
      await client.query('UPDATE resource_allocations SET status = \'cancelled\' WHERE id = $1', [losingAllocationId]);

      // Resolve the conflict
      await client.query(
        'UPDATE resource_conflicts SET status = \'resolved\', resolution = $1 WHERE id = $2',
        [resolutionText, conflictId]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new ResourceService();
