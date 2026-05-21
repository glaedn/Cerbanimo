import pool from '../db.js';
import ImpactGraphService from './ImpactGraphService.js';
import { sendNotification } from './NotificationService.js';

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

    const userSkillsRaw = userResult.rows[0].skills || [];
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

    try {
      const result = await pool.query(matchingTasksQuery, [parseInt(userId), userSkills, '%unassigned']);
      return result.rows;
    } catch (queryErr) {
      console.error(`Complex matching query failed for userId ${userId}, attempting fallback:`, queryErr.message);
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

  async runDailyTaskActivationAndNotification() {
    console.log('Running daily task activation and notification...');

    const inactiveTasksQuery = `
      SELECT id, project_id, dependencies, status, due_date
      FROM tasks
      WHERE status::text LIKE 'inactive%'
    `;
    const { rows: inactiveTasks } = await pool.query(inactiveTasksQuery);

    for (const task of inactiveTasks) {
      let shouldActivate = false;

      if (!task.dependencies || task.dependencies.length === 0) {
        shouldActivate = true;
      } else {
        const depsQuery = `
          SELECT status FROM tasks WHERE id = ANY($1)
        `;
        const { rows: depStatuses } = await pool.query(depsQuery, [task.dependencies]);
        if (depStatuses.every(d => d.status === 'completed')) {
          shouldActivate = true;
        }
      }

      if (shouldActivate) {
        const now = new Date();
        const due = task.due_date ? new Date(task.due_date) : null;
        const isUrgent = due && (due - now) < (24 * 60 * 60 * 1000);

        let newStatus;
        if (task.status.includes('assigned')) {
          newStatus = isUrgent ? 'urgent-assigned' : 'active-assigned';
        } else {
          newStatus = isUrgent ? 'urgent-unassigned' : 'active-unassigned';
        }

        await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [newStatus, task.id]);
        console.log(`Task ${task.id} activated with status ${newStatus}`);
      }
    }

    const projectsWithAutoAssign = await pool.query('SELECT id FROM projects WHERE auto_assign = TRUE');
    const autoAssignProjectIds = projectsWithAutoAssign.rows.map(p => p.id);

    if (autoAssignProjectIds.length === 0) {
      console.log('No projects with auto-notify enabled.');
      return;
    }

    const unassignedTasksQuery = `
      SELECT t.id, t.name, t.skill_id, t.project_id, p.community_id, p.tags as project_tags
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status::text LIKE '%unassigned' AND t.status::text NOT LIKE 'inactive%'
      AND t.project_id = ANY($1)
    `;
    const { rows: unassignedTasks } = await pool.query(unassignedTasksQuery, [autoAssignProjectIds]);

    for (const task of unassignedTasks) {
      await this.notifyMatchingUsers(task);
    }
  }

  async activateProjectTasks(projectId) {
    const projectResult = await pool.query('SELECT auto_assign FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) return;
    const { auto_assign } = projectResult.rows[0];

    const tasksQuery = `
      SELECT id, name, dependencies, status, due_date
      FROM tasks
      WHERE project_id = $1 AND status::text LIKE 'inactive%'
    `;
    const { rows: tasks } = await pool.query(tasksQuery, [projectId]);

    for (const task of tasks) {
      let shouldActivate = false;
      if (!task.dependencies || task.dependencies.length === 0) {
        shouldActivate = true;
      } else {
        const depsQuery = `SELECT status FROM tasks WHERE id = ANY($1)`;
        const { rows: depStatuses } = await pool.query(depsQuery, [task.dependencies]);
        if (depStatuses.every(d => d.status === 'completed')) {
          shouldActivate = true;
        }
      }

      if (shouldActivate) {
        const now = new Date();
        const due = task.due_date ? new Date(task.due_date) : null;
        const isUrgent = due && (due - now) < (24 * 60 * 60 * 1000);

        let newStatus;
        if (task.status.includes('assigned')) {
          newStatus = isUrgent ? 'urgent-assigned' : 'active-assigned';
        } else {
          newStatus = isUrgent ? 'urgent-unassigned' : 'active-unassigned';
        }

        await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [newStatus, task.id]);

        if (auto_assign && newStatus.includes('unassigned')) {
          const taskData = await pool.query(`
            SELECT t.id, t.name, t.skill_id, t.project_id, p.community_id, p.tags as project_tags
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.id = $1
          `, [task.id]);
          await this.notifyMatchingUsers(taskData.rows[0]);
        }
      }
    }
  }

  async notifyMatchingUsers(task) {
    const activeUsersQuery = `
      SELECT u.id, u.skills, u.interests, count(t.id) as current_assignments
      FROM users u
      LEFT JOIN tasks t ON u.id = ANY(t.assigned_user_ids) AND t.status NOT IN ('completed', 'cancelled')
      WHERE u.capacity_status = 'active'
      GROUP BY u.id
      HAVING count(t.id) < 3
    `;
    const { rows: candidates } = await pool.query(activeUsersQuery);

    if (candidates.length === 0) return;

    const communityTags = [];
    if (task.community_id) {
      const commResult = await pool.query('SELECT interest_tags FROM communities WHERE id = $1', [task.community_id]);
      if (commResult.rows.length > 0 && commResult.rows[0].interest_tags) {
        const tagNamesResult = await pool.query('SELECT name FROM interests WHERE id = ANY($1)', [commResult.rows[0].interest_tags]);
        communityTags.push(...tagNamesResult.rows.map(r => r.name));
      }
    }
    const combinedTags = [...new Set([...(task.project_tags || []), ...communityTags])];

    const scoredCandidates = [];

    for (const user of candidates) {
      const userSkills = (user.skills || []).map(s => {
          if (typeof s === 'string') {
              try { return JSON.parse(s).id; } catch(e) { return null; }
          }
          return s.id;
      }).filter(id => id != null);

      const skillMatch = task.skill_id ? userSkills.includes(task.skill_id) : true;
      if (!skillMatch) continue;

      const userInterests = (user.interests || []).map(i => {
          if (typeof i === 'string') {
              try { return JSON.parse(i).name; } catch(e) { return null; }
          }
          return i.name;
      }).filter(n => n != null);

      const matches = combinedTags.filter(tag => userInterests.includes(tag)).length;

      const dailyLimitQuery = `
        SELECT count(*) FROM notifications
        WHERE user_id = $1 AND type = 'task'
        AND created_at > NOW() - INTERVAL '24 hours'
      `;
      const { rows: [{ count: dailyCount }] } = await pool.query(dailyLimitQuery, [user.id]);

      if (parseInt(dailyCount) < 3) {
        scoredCandidates.push({
          ...user,
          interestMatches: matches
        });
      }
    }

    if (scoredCandidates.length === 0) return;

    scoredCandidates.sort((a, b) => {
      if (b.interestMatches !== a.interestMatches) {
        return b.interestMatches - a.interestMatches;
      }
      return a.current_assignments - b.current_assignments;
    });

    const topCandidates = scoredCandidates.slice(0, 5);

    for (const user of topCandidates) {
        await sendNotification(user.id, {
          taskId: task.id,
          message: `A new task matching your skills has become active: ${task.name || task.id}. Matches ${user.interestMatches} of your interests!`,
          type: 'task'
        });

        console.log(`Task ${task.id} notification sent to user ${user.id} (Matches: ${user.interestMatches})`);
    }
  }
}

export default new TaskRoutingService();
