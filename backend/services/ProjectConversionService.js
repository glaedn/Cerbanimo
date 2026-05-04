import pool from '../db.js';
import { autoGenerateTasks } from './taskGenerator.js';
import ImpactGraphService from './ImpactGraphService.js';
import TaskRoutingService from './TaskRoutingService.js';
import { findMatchesForNeed } from './matchingService.js';
import DiscordBotService from './DiscordBotService.js';

class ProjectConversionService {
  async convertNeedToProject(needId) {
    console.log(`Converting need ${needId} to a project...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch the need
      const needResult = await client.query('SELECT * FROM needs WHERE id = $1', [needId]);
      if (needResult.rows.length === 0) {
        throw new Error(`Need with ID ${needId} not found`);
      }
      const need = needResult.rows[0];

      if (need.project_id) {
        console.log(`Need ${needId} is already associated with project ${need.project_id}. Skipping conversion.`);
        await client.query('ROLLBACK');
        return { id: need.project_id };
      }

      // 2. Determine creator_id (use requestor_user_id or a system default)
      let creatorId = need.requestor_user_id;
      if (!creatorId && need.requestor_community_id) {
        console.log('No requestor_user_id, checking for community admin...');
        // Find a community admin if no user requestor
        const adminResult = await client.query(
          "SELECT id FROM users WHERE roles @> '{admin}' LIMIT 1"
        );
        creatorId = adminResult.rows[0]?.id;
      }

      if (!creatorId) {
        console.log('Still no creatorId, trying system admin fallback...');
        const systemAdminResult = await client.query(
            "SELECT id FROM users WHERE roles @> '{admin}' LIMIT 1"
        );
        creatorId = systemAdminResult.rows[0]?.id;
      }

      if (!creatorId) {
        throw new Error('Could not determine a creator for the project');
      }

      // 3. Create the project
      const projectName = `Project: ${need.name}`;
      const projectDescription = `Automated coordination for need: ${need.description}`;
      const outcomeStatement = `Fulfill the need for ${need.name}`;

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
        need.required_before_date
      ]);
      const project = projectResult.rows[0];

      // 4. Create initial outcome
      await ImpactGraphService.createOutcome(project.id, outcomeStatement, client);

      // 5. Link need to project
      await client.query('UPDATE needs SET project_id = $1, status = $2 WHERE id = $3', [project.id, 'in_progress', need.id]);

      // 5a. Notify Discord if thread exists
      if (need.discord_thread_id) {
        try {
          const thread = await DiscordBotService.client.channels.fetch(need.discord_thread_id);
          if (thread && thread.isThread()) {
            await thread.send(`🚀 **Project Formed!** This need has been escalated to a structured project: [Cerbanimo Project Link](${process.env.FRONTEND_URL}/visualizer/${project.id})`);
          }
        } catch (discordErr) {
          console.warn('Failed to notify Discord of project conversion:', discordErr);
        }
      }

      // 5b. Find matched users for potential auto-assignment
      const matches = await findMatchesForNeed(need.id, pool);
      let topUsers = matches.users.filter(u => u.match_score >= 80);

      // If no users found at threshold 80, widen the threshold to 60
      if (topUsers.length === 0) {
        console.log('No users found at threshold 80, widening to 60...');
        topUsers = matches.users.filter(u => u.match_score >= 60);
      }

      // 6. Generate Task Tree using LLM
      let generatedData;
      try {
        generatedData = await autoGenerateTasks(
          project.name,
          project.description,
          need.category || 'Coordination',
          creatorId,
          need.required_before_date,
          outcomeStatement
        );
      } catch (llmErr) {
        console.error('LLM Task Generation failed, using fallback task:', llmErr);
        generatedData = {
          tasks: [{
            id: 1,
            name: `Coordinate: ${need.name}`,
            description: need.description,
            skill_name: need.category || 'General',
            skill_level: 1,
            reward_tokens: 100,
            impact_label: 'Directly fulfills the primary need.',
            impact_weight: 100,
            start_date: new Date().toISOString(),
            due_date: need.required_before_date || new Date(Date.now() + 7*24*60*60*1000).toISOString()
          }]
        };
      }

      // 7. Insert Generated Tasks
      const taskIdMap = new Map(); // Maps LLM temporary IDs to DB IDs

      for (const taskData of generatedData.tasks) {
        const insertTaskQuery = `
          INSERT INTO tasks (
            name, description, project_id, skill_id, skill_level,
            reward_tokens, start_date, due_date, status, impact_label, impact_weight
          )
          VALUES ($1, $2, $3, (SELECT id FROM skills WHERE name = $4 LIMIT 1), $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;

        const taskResult = await client.query(insertTaskQuery, [
          taskData.name,
          taskData.description,
          project.id,
          taskData.skill_name,
          taskData.skill_level || 0,
          taskData.reward_tokens || 50,
          taskData.start_date,
          taskData.due_date,
          'unassigned',
          taskData.impact_label,
          taskData.impact_weight
        ]);

        const newTask = taskResult.rows[0];
        taskIdMap.set(taskData.id, newTask.id);

        // Auto-assign top matched users (if any)
        if (topUsers.length > 0) {
          const userIds = topUsers.map(u => u.id);
          await client.query(
            "UPDATE tasks SET assigned_user_ids = $1, status = 'assigned' WHERE id = $2",
            [userIds, newTask.id]
          );
          console.log(`Auto-assigned users ${userIds.join(',')} to task ${newTask.id}`);
        }

        // Update Impact Graph for each task
        await ImpactGraphService.syncTaskNode(newTask.id, client);
        await ImpactGraphService.linkTaskToOutcome(newTask.id, project.id, taskData.impact_weight, client);
      }

      // 8. Handle Dependencies
      for (const taskData of generatedData.tasks) {
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

      await client.query('COMMIT');

      // 9. Post-commit: Calculate priority scores for all new tasks
      for (const dbTaskId of taskIdMap.values()) {
        try {
          await TaskRoutingService.calculatePriorityScore(dbTaskId);
        } catch (routingErr) {
          console.error(`Failed to calculate priority score for task ${dbTaskId}:`, routingErr);
        }
      }

      console.log(`Successfully converted need ${needId} to project ${project.id}`);
      return project;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error converting need ${needId} to project:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new ProjectConversionService();
