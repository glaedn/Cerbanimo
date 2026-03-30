// backend/services/AllocationService.js

/**
 * AllocationService handles resource assignment, availability windows, and bookings.
 * Tasks can require users + resources. Overbooking creates a conflict.
 */
class AllocationService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Allocate a resource for a specific task and duration.
   * @param {string} resourceId
   * @param {string} taskId
   * @param {Date} startTime
   * @param {Date} endTime
   * @returns {Promise<Object>}
   */
  async allocateResource(resourceId, taskId, startTime, endTime) {
    // 1. Check for existing allocations (double-booking detection)
    const { rows: existingAllocations } = await this.db.query(
      `SELECT * FROM resource_allocations
       WHERE resource_id = $1
       AND (start_time, end_time) OVERLAPS ($2, $3)`,
      [resourceId, startTime, endTime]
    );

    if (existingAllocations.length > 0) {
      // 2. Conflict Mechanics — Resource Level
      // First-come-first-served with a conflict flag
      const conflictResult = await this.db.query(
        `INSERT INTO resource_conflicts (resource_id, task_id, existing_task_id, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [resourceId, taskId, existingAllocations[0].task_id, startTime, endTime]
      );

      // In a real system, you might notify the owner or first requester.
      return { status: 'conflict', conflict_id: conflictResult.rows[0].id };
    }

    // 3. No conflict, proceed with allocation
    const { rows: allocationResult } = await this.db.query(
      `INSERT INTO resource_allocations (resource_id, task_id, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [resourceId, taskId, startTime, endTime]
    );

    return { status: 'success', allocation: allocationResult[0] };
  }

  /**
   * Handle withdrawal of constellation resource pledges (Phase 3).
   * @param {string} resourceId
   * @param {string} constellationId
   */
  async handlePledgeWithdrawal(resourceId, constellationId) {
    // Log the withdrawal
    await this.db.query(
      `INSERT INTO resource_events (resource_id, event_type, metadata)
       VALUES ($1, 'pledge_withdrawal', $2)`,
      [resourceId, { constellation_id: constellationId }]
    );

    // Flag in constellation health score (Phase 7)
    // and visible in contributor story (Phase 5).
    const { rows: resourceOwner } = await this.db.query(
      'SELECT owner_id FROM resources WHERE id = $1',
      [resourceId]
    );

    if (resourceOwner.length > 0) {
      await this.db.query(
        'INSERT INTO user_stories (user_id, story_type, summary) VALUES ($1, \'resource_withdrawal\', $2)',
        [resourceOwner[0].owner_id, `You withdrew a pledged resource (${resourceId}) from constellation ${constellationId}.`]
      );
    }
  }

  async getAllocationsByTaskId(taskId) {
    const { rows } = await this.db.query(
      'SELECT r.*, ra.start_time, ra.end_time FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.task_id = $1',
      [taskId]
    );
    return rows;
  }
}

export default AllocationService;
