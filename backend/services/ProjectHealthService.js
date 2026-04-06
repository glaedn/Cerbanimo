import pool from '../db.js';

class ProjectHealthService {
  async calculateHealthScore(projectId) {
    const query = `
      SELECT p.id, p.created_at, p.status,
             (SELECT count(*) FROM tasks WHERE project_id = $1 AND status = 'completed') as completed_count,
             (SELECT count(*) FROM tasks WHERE project_id = $1) as total_count,
             (SELECT count(*) FROM tasks WHERE project_id = $1 AND updated_at > NOW() - INTERVAL '7 days') as recent_activity
      FROM projects p
      WHERE p.id = $1;
    `;
    const result = await pool.query(query, [projectId]);
    const project = result.rows[0];

    // Health Score Formula:
    // (CompletedCount/TotalCount) * (1 + RecentActivity/5)
    let health = 0;
    if (project.total_count > 0) {
      health = (project.completed_count / project.total_count) * (1 + project.recent_activity / 5);
    }

    await pool.query(
      'UPDATE projects SET health_score = $1 WHERE id = $2',
      [health, projectId]
    );

    return health;
  }

  async closeProject(projectId, reason, resolutionStatement = '') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE projects SET status = $1, closure_reason = $2 WHERE id = $3',
        ['closed', reason, projectId]
      );

      // Resolve all open tasks (cancel them for now)
      await client.query(
        'UPDATE tasks SET status = $1 WHERE project_id = $2 AND status::text NOT LIKE $3',
        ['cancelled', projectId, 'completed']
      );

      // Final resolution for outcome (assuming one outcome per project for simplicity)
      await client.query(
        'UPDATE outcomes SET status = $1, resolution_statement = $2 WHERE project_id = $3',
        ['achieved', resolutionStatement, projectId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async reviveProject(projectId) {
     const query = `
      UPDATE projects SET status = 'active' WHERE id = $1 RETURNING *;
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows[0];
  }
}

export default new ProjectHealthService();
