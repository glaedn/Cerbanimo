import pool from '../db.js';

class GuildHealthService {
  async calculateGuildMetrics(guildId) {
    const guildQuery = 'SELECT skill_id FROM guilds WHERE id = $1';
    const guildRes = await pool.query(guildQuery, [guildId]);
    if (guildRes.rows.length === 0) return null;
    const skillId = guildRes.rows[0].skill_id;

    const statsQuery = `
      SELECT
        (SELECT count(*) FROM tasks WHERE skill_id = $1 AND status::text LIKE $2) as open_tasks,
        (SELECT count(*) FROM tasks WHERE status::text LIKE $2) as total_open_tasks,
        (SELECT count(*) FROM tasks WHERE skill_id = $1 AND status::text = 'completed') as completed_tasks,
        (SELECT count(*) FROM tasks WHERE skill_id = $1 AND status::text NOT LIKE $2) as submitted_tasks,
        (SELECT count(*) FROM tasks WHERE skill_id = $1) as total_tasks,
        (SELECT AVG(reward_tokens) FROM tasks WHERE skill_id = $1) as avg_reward,
        (SELECT count(*) FROM verification_events ve JOIN tasks t ON ve.task_id = t.id WHERE t.skill_id = $1 AND ve.status = 'verified') as verified_count,
        (SELECT count(*) FROM disputes d JOIN tasks t ON d.task_id = t.id WHERE t.skill_id = $1 AND d.status = 'overturned') as overturned_count
    `;
    // Removed FROM tasks LIMIT 1 to avoid crash if tasks table is empty.
    const statsRes = await pool.query(statsQuery, [skillId, '%unassigned']);
    const stats = statsRes.rows[0];

    const task_demand = (stats.total_open_tasks && parseInt(stats.total_open_tasks) > 0) ? parseInt(stats.open_tasks) / parseInt(stats.total_open_tasks) : 0;
    const completion_rate = (stats.total_tasks && parseInt(stats.total_tasks) > 0) ? parseInt(stats.completed_tasks) / parseInt(stats.total_tasks) : 0;
    const reward_average = parseFloat(stats.avg_reward || 0);
    const submitted_tasks_count = parseInt(stats.submitted_tasks || 0);

    const verified_count = parseInt(stats.verified_count || 0);
    const overturned_count = parseInt(stats.overturned_count || 0);
    const total_verifications = verified_count + overturned_count;
    const verification_pass_rate = total_verifications > 0 ? verified_count / total_verifications : 1.0;

    // Health Score: weighted average
    const health_score = (completion_rate * 0.4) + (verification_pass_rate * 0.4) + (Math.min(task_demand * 2, 1) * 0.2);

    const insertQuery = `
      INSERT INTO guild_metrics (guild_id, task_demand, completion_rate, reward_average, verification_pass_rate, health_score, submitted_tasks_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [
      guildId, task_demand, completion_rate, reward_average, verification_pass_rate, health_score, submitted_tasks_count
    ]);

    return result.rows[0];
  }
}

export default new GuildHealthService();
