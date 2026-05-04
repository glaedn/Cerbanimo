import pool from '../db.js';
import StoryEngineService from './StoryEngineService.js';

class ProjectHealthService {
  async calculateHealthScore(projectId) {
    const query = `
      SELECT p.id, p.created_at, p.status,
             (SELECT count(*) FROM tasks WHERE project_id = $1 AND status = 'completed') as completed_count,
             (SELECT count(*) FROM tasks WHERE project_id = $1) as total_count,
             (SELECT count(*) FROM tasks WHERE project_id = $1 AND updated_at > NOW() - INTERVAL '7 days') as recent_activity,
             (SELECT AVG(EXTRACT(EPOCH FROM (accepted_at - created_at))) FROM tasks WHERE project_id = $1 AND accepted_at IS NOT NULL) as avg_response_time
      FROM projects p
      WHERE p.id = $1;
    `;
    const result = await pool.query(query, [projectId]);
    const project = result.rows[0];

    // Health Score Formula:
    // (CompletedCount/TotalCount) * (1 + RecentActivity/5) - (ResponseTimePenalty)
    let health = 0;
    if (project.total_count > 0) {
      health = (project.completed_count / project.total_count) * (1 + project.recent_activity / 5);

      // Penalty for slow response (over 24h average)
      if (project.avg_response_time > 86400) {
        health -= 0.1;
      }
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

  async getContributorLoad(userId) {
    const query = `
      SELECT count(*) as active_tasks
      FROM tasks
      WHERE assignee_id = $1 AND status = 'assigned';
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].active_tasks);
  }

  async reviveProject(projectId, reviverId) {
     const query = `
      UPDATE projects SET status = 'active', health_score = 0.5 WHERE id = $1 RETURNING *;
    `;
    const result = await pool.query(query, [projectId]);
    const project = result.rows[0];

    // Phase 7: Revival Mechanics - Log revival in Story Engine
    // We create a story unit for the reviver, linked to the project.
    // Since there's no task_id, we might need to handle this specially in StoryEngine or use a placeholder.
    // For now, let's assume StoryEngineService.createStoryUnit can handle null taskId for project-level events.
    try {
      await pool.query(
        `INSERT INTO story_units (user_id, project_id, role, task_type)
         VALUES ($1, $2, 'reviver', 'project_revival')`,
        [reviverId, projectId]
      );
      await StoryEngineService.detectUserPatterns(reviverId);
    } catch (err) {
      console.error("Failed to log project revival story unit:", err);
    }

    return project;
  }
}

export default new ProjectHealthService();
