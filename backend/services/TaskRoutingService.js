import pool from '../db.js';
import ImpactGraphService from './ImpactGraphService.js';

class TaskRoutingService {
  async calculatePriorityScore(taskId) {
    // Phase 4: Dynamic Impact Depth calculation
    const impactDepth = await ImpactGraphService.calculateImpactDepth(taskId);
    await pool.query('UPDATE tasks SET impact_depth = $1 WHERE id = $2', [impactDepth, taskId]);

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

    // Timeline Urgency Transition
    await this.checkTimelineUrgency(taskId);

    return score;
  }

  async checkTimelineUrgency(taskId) {
    const query = `
      SELECT id, status, due_date
      FROM tasks
      WHERE id = $1 AND due_date IS NOT NULL AND status NOT IN ('completed', 'submitted');
    `;
    const result = await pool.query(query, [taskId]);
    const task = result.rows[0];

    if (task) {
        const now = new Date();
        const due = new Date(task.due_date);
        const diffHours = (due - now) / (1000 * 60 * 60);

        if (diffHours <= 24 && !task.status.startsWith('urgent')) {
            let newStatus;
            if (task.status.includes('assigned')) {
                newStatus = 'urgent-assigned';
            } else {
                newStatus = 'urgent-unassigned';
            }

            await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [newStatus, taskId]);
            console.log(`Task ${taskId} transitioned to ${newStatus} due to timeline pressure (due in ${diffHours.toFixed(1)}h)`);
        }
    }
  }

  async getMatchingTasksForUser(userId) {
    try {
    const userQuery = 'SELECT skills FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return [];
    }

    const userSkillsRaw = userResult.rows[0].skills || []; // Assuming skill objects {id, name}
    const userSkills = Array.isArray(userSkillsRaw)
      ? userSkillsRaw.map(s => {
          if (typeof s === 'string' && s.startsWith('{')) {
            try {
              const parsed = JSON.parse(s);
              return parsed.id || parsed;
            } catch (e) { return s; }
          }
          return typeof s === 'object' ? s.id : s;
        }).map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : [];

    // Phase 4: Matching with Impact Alignment
    // Boost tasks that are linked to outcomes the user has successfully contributed to before.
    const matchingTasksQuery = `
      WITH user_impacted_outcomes AS (
        SELECT DISTINCT o.id
        FROM story_units su
        JOIN outcomes o ON su.project_id = o.project_id
        WHERE su.user_id = $1
      )
      SELECT t.*, p.name as project_name,
             CASE WHEN EXISTS (
               SELECT 1 FROM impact_nodes tn
               JOIN impact_edges te ON tn.id = te.from_node_id
               JOIN impact_nodes onode ON te.to_node_id = onode.id
               WHERE tn.type = 'task' AND tn.entity_id = t.id
               AND onode.type = 'outcome' AND onode.entity_id IN (SELECT id FROM user_impacted_outcomes)
             ) THEN 1.2 ELSE 1.0 END as impact_alignment_boost
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE (t.skill_id = ANY($2::int[]) OR t.skill_id IS NULL)
      AND t.status::text LIKE $3
      ORDER BY (COALESCE(t.priority_score, 0) * (
             CASE WHEN EXISTS (
               SELECT 1 FROM impact_nodes tn
               JOIN impact_edges te ON tn.id = te.from_node_id
               JOIN impact_nodes onode ON te.to_node_id = onode.id
               WHERE tn.type = 'task' AND tn.entity_id = t.id
               AND onode.type = 'outcome' AND onode.entity_id IN (SELECT id FROM user_impacted_outcomes)
             ) THEN 1.2 ELSE 1.0 END
      )) DESC
      LIMIT 20;
    `;
    // Note: Applying the boost in ORDER BY would be ideal:
    // ORDER BY (t.priority_score * (CASE WHEN ... THEN 1.2 ELSE 1.0 END)) DESC

    try {
      const result = await pool.query(matchingTasksQuery, [parseInt(userId), userSkills, '%unassigned']);
      return result.rows;
    } catch (queryErr) {
      console.error(`Complex matching query failed for userId ${userId}, attempting fallback:`, queryErr.message);
      // Fallback to a simpler query that doesn't rely on Phase 4 impact tables
      const fallbackQuery = `
        SELECT t.*, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE (t.skill_id = ANY($1::int[]) OR t.skill_id IS NULL)
        AND t.status::text LIKE $2
        ORDER BY COALESCE(t.priority_score, 0) DESC
        LIMIT 20;
      `;
      const fallbackResult = await pool.query(fallbackQuery, [userSkills, '%unassigned']);
      return fallbackResult.rows;
    }
    } catch (err) {
      console.error(`Critical error in getMatchingTasksForUser for userId ${userId}:`, err);
      throw err;
    }
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
