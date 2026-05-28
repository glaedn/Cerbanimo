import pool from '../../db.js';

class FrictionDetectionEngine {
  async detectFriction(userId, context) {
    const frictions = [];

    // Detect stalled missions
    if (context.system.blockedMissions.length > 0) {
      frictions.push({
        type: 'friction',
        priority: 'high',
        category: 'mission',
        message: `${context.system.blockedMissions.length} of your missions are currently stalled.`,
        data: context.system.blockedMissions
      });
    }

    // Detect coordinator overload
    if (context.emotionalState === 'overloaded') {
      frictions.push({
        type: 'friction',
        priority: 'medium',
        category: 'coordination',
        message: 'High coordination load detected. Consider delegating tasks.',
      });
    }

    // Detect overdue tasks
    // assigned_to -> assigned_user_ids (array), deadline -> due_date
    const overdueTasks = await pool.query(
      'SELECT id, name FROM tasks WHERE $1 = ANY(assigned_user_ids) AND due_date < NOW() AND status != \'completed\'',
      [userId]
    );

    if (overdueTasks.rowCount > 0) {
      frictions.push({
        type: 'friction',
        priority: 'high',
        category: 'deadline',
        message: `You have ${overdueTasks.rowCount} overdue task(s).`,
        data: overdueTasks.rows
      });
    }

    return frictions;
  }
}

export default new FrictionDetectionEngine();
