import pool from '../db.js';

class ConstellationHealthService {
  async calculateConstellationMetrics(constellationId) {
    const query = `
      SELECT
        (SELECT count(*) FROM constellation_tasks ct JOIN tasks t ON ct.task_id = t.id WHERE ct.constellation_id = $1 AND t.status = 'completed') as completed_count,
        (SELECT count(*) FROM constellation_tasks WHERE constellation_id = $1) as total_count,
        (SELECT count(*) FROM constellation_tasks ct JOIN tasks t ON ct.task_id = t.id WHERE ct.constellation_id = $1 AND t.status = 'completed' AND t.updated_at > NOW() - INTERVAL '7 days') as recent_activity,
        (SELECT count(DISTINCT entity_id) FROM constellation_members WHERE constellation_id = $1) as entity_count
      FROM constellations WHERE id = $1;
    `;
    const result = await pool.query(query, [constellationId]);
    if (result.rows.length === 0) return null;
    const stats = result.rows[0];

    const tasks_completed = parseInt(stats.completed_count);
    const tasks_total = parseInt(stats.total_count);
    const recent_activity = parseInt(stats.recent_activity);
    const entity_count = parseInt(stats.entity_count);

    const velocity = recent_activity / 7.0;

    // Health Score Formula:
    // (CompletedCount/TotalCount) * (1 + velocity/5) * (MIN(entity_count, 3)/3)
    let health_score = 0;
    if (tasks_total > 0) {
      health_score = (tasks_completed / tasks_total) * (1 + velocity / 5) * (Math.min(entity_count, 3) / 3);
    } else {
        // If no tasks yet, but members exist, give a baseline
        health_score = 0.5 * (Math.min(entity_count, 3) / 3);
    }

    await pool.query(
      'UPDATE constellations SET health_score = $1, velocity = $2 WHERE id = $3',
      [health_score, velocity, constellationId]
    );

    return { health_score, velocity, tasks_completed, tasks_total };
  }
}

export default new ConstellationHealthService();
