import pool from '../db.js';

class TaskRoutingService {
  async calculatePriorityScore(taskId) {
    const query = `
      SELECT t.reward_tokens, t.impact_depth, t.decay_factor,
             t.created_at, t.status,
             (SELECT count(*) FROM tasks WHERE $1 = ANY(dependencies)) as dependency_count
      FROM tasks t
      WHERE t.id = $1;
    `;
    const result = await pool.query(query, [taskId]);
    const task = result.rows[0];

    // Priority Score Formula:
    // Reward * (1 + ImpactDepth/5) * DecayFactor * (1 + DependencyCount/2) * (1 + TaskAgeDays/10)
    const taskAgeDays = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);

    let score = task.reward_tokens * (1 + task.impact_depth / 5) *
                task.decay_factor * (1 + task.dependency_count / 2) *
                (1 + taskAgeDays / 10);

    await pool.query(
      'UPDATE tasks SET priority_score = $1 WHERE id = $2',
      [score, taskId]
    );

    return score;
  }

  async getMatchingTasksForUser(userId) {
    const userQuery = 'SELECT skills FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const userSkills = userResult.rows[0].skills || []; // Assuming skill IDs or names

    const matchingTasksQuery = `
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE (t.skill_id = ANY($1) OR t.skill_id IS NULL)
      AND t.status::text LIKE $2
      ORDER BY t.priority_score DESC
      LIMIT 20;
    `;
    const result = await pool.query(matchingTasksQuery, [userSkills, '%unassigned']);
    return result.rows;
  }

  async applyDynamicRewardAdjustment() {
    // Increase rewards for aging tasks
    const query = `
      UPDATE tasks
      SET
        reward_tokens = LEAST(reward_tokens * 1.1, COALESCE(reward_ceiling, reward_tokens * 3)),
        decay_factor = decay_factor * 1.1
      WHERE status::text LIKE $1
      AND created_at < NOW() - INTERVAL '3 days'
      RETURNING id, reward_tokens;
    `;
    const result = await pool.query(query, ['%unassigned']);
    return result.rows;
  }
}

export default new TaskRoutingService();
