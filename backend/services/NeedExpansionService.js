import pool from '../db.js';
import { generateTasksFromNeed } from './needsGenerator.js';
import ImpactGraphService from './ImpactGraphService.js';
import TaskRoutingService from './TaskRoutingService.js';
import StoryEngineService from './StoryEngineService.js';
import IntentEngineService from './IntentEngineService.js';

class NeedExpansionService {
  async expandNeed(need) {
    console.log(`Expanding need ${need.id} into a project...`);

    let requiredBeforeDate = need.required_before_date;
    if (!requiredBeforeDate) {
      const urgency = (need.urgency_level || need.urgency || '').toLowerCase();
      if (urgency === 'critical') {
        requiredBeforeDate = new Date().toISOString();
      } else if (urgency === 'high') {
        requiredBeforeDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        requiredBeforeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const projectName = `Need: ${need.name}`;
      const projectDescription = need.description;
      const creatorId = need.requestor_user_id;

      const insertProjectQuery = `
        INSERT INTO projects (name, description, creator_id, community_id, due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const projectResult = await client.query(insertProjectQuery, [
        projectName,
        projectDescription,
        creatorId,
        need.requestor_community_id,
        requiredBeforeDate
      ]);
      const project = projectResult.rows[0];

      let generatedData;
      try {
        generatedData = await generateTasksFromNeed(need);
      } catch (err) {
        console.error('LLM Task Generation failed for need, using fallback:', err);
        generatedData = {
          tasks: [{
            id: 1,
            name: `Fulfill: ${need.name}`,
            description: need.description,
            skill_name: need.category || 'General',
            reward_tokens: 100,
            impact_label: 'Directly fulfills the primary need.',
            impact_weight: 100,
            start_date: new Date().toISOString(),
            due_date: requiredBeforeDate
          }]
        };
      }

      const baseReward = 20;
      const multiplier = 1 + (need.complexity_score * 0.5);
      const tasks = generatedData.tasks.slice(0, 10);

      const taskIdMap = new Map();
      const createdTasks = [];
      for (const taskData of tasks) {
        const rewardTokens = Math.round((taskData.reward_tokens || baseReward) * multiplier);

        const insertTaskQuery = `
          INSERT INTO tasks (
            name, description, project_id, skill_id,
            reward_tokens, start_date, due_date, status, impact_label, impact_weight, related_need_id
          )
          VALUES ($1, $2, $3, (SELECT id FROM skills WHERE name = $4 LIMIT 1), $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        const taskResult = await client.query(insertTaskQuery, [
          taskData.name,
          taskData.description,
          project.id,
          taskData.skill_name,
          rewardTokens,
          taskData.start_date || new Date().toISOString(),
          taskData.due_date || requiredBeforeDate,
          'unassigned',
          taskData.impact_label,
          taskData.impact_weight,
          need.id
        ]);

        const newTask = taskResult.rows[0];
        taskIdMap.set(taskData.id, newTask.id);
        createdTasks.push(newTask);

        if (typeof ImpactGraphService.syncTaskNode === 'function') {
          await ImpactGraphService.syncTaskNode(newTask.id, client);
        }
      }

      for (const taskData of tasks) {
        if (taskData.dependencies && taskData.dependencies.length > 0) {
          const dbTaskId = taskIdMap.get(taskData.id);
          const dbDependencies = taskData.dependencies
            .map(depId => taskIdMap.get(depId))
            .filter(id => id !== undefined);

          if (dbDependencies.length > 0) {
            await client.query(
              'UPDATE tasks SET dependencies = $1 WHERE id = $2',
              [dbDependencies, dbTaskId]
            );
          }
        }
      }

      await client.query(
        'UPDATE needs SET is_expanded = true, linked_project_id = $1 WHERE id = $2',
        [project.id, need.id]
      );

      await StoryEngineService.createFromNeed({
        needId: need.id,
        projectId: project.id,
        complexity: need.complexity_score
      }).catch(err => console.error('Failed to trigger story from need expansion:', err));

      await IntentEngineService.registerNeedExpansion(need, project, createdTasks, client)
        .catch(err => console.error('Civic kernel need expansion registration failed:', err));

      await client.query('COMMIT');

      for (const dbTaskId of taskIdMap.values()) {
        TaskRoutingService.calculatePriorityScore(dbTaskId).catch(err => console.error('Priority score failed:', err));
      }

      return project;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed to expand need ${need.id}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  async checkProjectCompletion(projectId) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM tasks
      WHERE project_id = $1
    `;
    const result = await pool.query(query, [projectId]);
    const { total, completed } = result.rows[0];
    return total > 0 && total === completed;
  }
}

export default new NeedExpansionService();
