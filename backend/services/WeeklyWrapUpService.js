import pool from '../db.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseLLMJsonResponse } from "./taskGenerator.js";
import pLimit from 'p-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class WeeklyWrapUpService {
  async generateWeeklyWrapUps() {
    console.log('Starting weekly wrap-up generation...');

    try {
      // 1. Get active users (completed tasks, reviewers, resource contributors, impact contributors)
      const activeUsersResult = await pool.query(`
        SELECT DISTINCT user_id FROM (
          -- Task Completers
          SELECT submitted_by as user_id
          FROM tasks
          WHERE completed_at > NOW() - INTERVAL '7 days'
          AND status = 'completed'
          AND submitted_by IS NOT NULL

          UNION

          -- Reviewers/Approvers
          SELECT verifier_id as user_id
          FROM verification_events
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND verifier_id IS NOT NULL

          UNION

          -- Resource Contributors
          SELECT owner_user_id as user_id
          FROM resources
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND owner_user_id IS NOT NULL

          UNION

          -- Impact Contributors
          SELECT user_id
          FROM impact_summaries
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND user_id IS NOT NULL

          UNION

          -- Constellation Pledges
          SELECT pledger_id as user_id
          FROM constellation_pledges
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND pledger_id IS NOT NULL
        ) AS active_users
      `);

      const userIds = activeUsersResult.rows.map(r => r.user_id);
      console.log(`Found ${userIds.length} active users.`);

      // Process all active users with concurrency control
      await this.processUserBatch(userIds);

      console.log('Weekly wrap-up generation complete.');
    } catch (err) {
      console.error('Failed to run weekly wrap-up generation:', err);
      throw err;
    }
  }

  async processUserBatch(userIds) {
    const batchSize = 10;
    const limit = pLimit(5);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday of current week
    weekStart.setHours(0, 0, 0, 0);

    const batches = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    const tasks = batches.map(batch => limit(async () => {
      try {
        const userData = [];
        for (const userId of batch) {
          const stats = await this.getUserWeeklyStats(userId);
          if (stats) userData.push(stats);
        }

        if (userData.length === 0) return;

        const prompt = `
          You are the Cerbanimo Story Engine, an advanced intelligence responsible for recording the operational records of the platform.
          Generate a "Weekly Wrap-up" summary for each user in this batch based on their missions and signals.

          Input Data (Batch of users and their stats):
          ${JSON.stringify(userData)}

          Cerbanimo Operational Context:
          - Missions: Tasks or objectives completed within projects.
          - Guilds: Skill-based professional collectives (e.g. Coding Guild).
          - Constellations: High-level strategic alliances working toward shared outcomes.
          - Signal: Data points of impact and progress.
          - Skill Galaxies: The broader taxonomy of user capabilities.
          - Impact Nodes: Verified points of real-world effect.

          Instructions:
          - For each user, generate a narrative (1-2 paragraphs) that sounds like a living operational record.
          - Use Cerbanimo vocabulary: missions, guilds, constellations, signals, impact nodes.
          - Analyze trends, momentum, and skill growth.
          - Compare this week's performance against last week and their 6-month average.
          - Highlight positive achievements and offer specific growth insights.
          - Use the highest-impact completed missions as the detailed examples. Explain their impact labels and relative impact weights in plain language.
          - Return a JSON array of objects, one for each user in the batch.

          Required Output Format:
          [
            {
              "user_id": 123,
              "content": "The narrative summary of the user's week in the Cerbanimo universe...",
              "structured_data": {
                 "weekly_momentum": "increasing/decreasing/stable",
                 "top_skill_focus": "Skill Name",
                 "growth_insight": "A short specific insight about their progress"
              }
            }
          ]

          - summary_type is 'weekly wrap-up'.
          - ONLY return the JSON array. Do not include markdown markers.
        `;

        const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const summaries = parseLLMJsonResponse(text);

        if (Array.isArray(summaries)) {
          for (const summary of summaries) {
            try {
              if (summary && summary.content) {
                await pool.query(
                  `INSERT INTO story_summaries (user_id, summary_type, content, structured_data, week_start_date)
                   VALUES ($1, 'weekly wrap-up', $2, $3, $4)
                   ON CONFLICT (user_id, week_start_date, summary_type) DO NOTHING`,
                  [summary.user_id, summary.content, JSON.stringify(summary.structured_data || {}), weekStart]
                );
              }
            } catch (innerErr) {
              console.error(`Error saving wrap-up for user ${summary.user_id}:`, innerErr);
            }
          }
        }
      } catch (err) {
        console.error(`Error processing batch:`, err);
        // Catch batch errors so other batches continue
      }
    }));

    await Promise.all(tasks);
    console.log(`Finished processing all batches for ${userIds.length} users.`);
  }

  async getUserWeeklyStats(userId) {
    try {
      const statsQuery = `
        WITH weekly_stats AS (
          SELECT
            COUNT(*) as tasks_this_week,
            COALESCE(SUM(reward_tokens), 0) as xp_this_week
          FROM tasks
          WHERE submitted_by = $1 AND status = 'completed' AND completed_at > NOW() - INTERVAL '7 days'
        ),
        last_week_stats AS (
          SELECT
            COUNT(*) as tasks_last_week,
            COALESCE(SUM(reward_tokens), 0) as xp_last_week
          FROM tasks
          WHERE submitted_by = $1 AND status = 'completed'
          AND completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
        ),
        six_month_stats AS (
          SELECT
            COUNT(*) as total_tasks_6m,
            COALESCE(SUM(reward_tokens), 0) as total_xp_6m,
            COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(completed_at))) / (7 * 24 * 3600), 1) as weeks_elapsed
          FROM tasks
          WHERE submitted_by = $1 AND status = 'completed' AND completed_at > NOW() - INTERVAL '6 months'
        )
        SELECT * FROM weekly_stats, last_week_stats, six_month_stats;
      `;

      const statsRes = await pool.query(statsQuery, [userId]);
      const row = statsRes.rows[0];

      if (!row) return null;

      const weeksElapsed = Math.max(parseFloat(row.weeks_elapsed) || 1, 1);
      const avgTasks6m = (parseInt(row.total_tasks_6m) || 0) / weeksElapsed;
      const avgXp6m = (parseInt(row.total_xp_6m) || 0) / weeksElapsed;

      // Skill details
      const skillStatsRes = await pool.query(`
        SELECT
          t.skill_id,
          s.name as skill_name,
          s.unlocked_users,
          AVG(t.skill_level) as avg_task_skill_level,
          COUNT(*) as tasks_count
        FROM tasks t
        JOIN skills s ON t.skill_id = s.id
        WHERE t.submitted_by = $1 AND t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '7 days'
        GROUP BY t.skill_id, s.name, s.unlocked_users
      `, [userId]);

      const skillData = [];
      for (const s of skillStatsRes.rows) {
        let currentLevel = 0;
        const unlockedUsers = Array.isArray(s.unlocked_users) ? s.unlocked_users : [];

        for (const entry of unlockedUsers) {
          let parsedEntry = entry;
          if (typeof entry === 'string') {
            try {
              parsedEntry = JSON.parse(entry);
            } catch (e) {
              continue;
            }
          }
          if (parsedEntry && String(parsedEntry.user_id) === String(userId)) {
            currentLevel = parseInt(parsedEntry.level) || 0;
            break;
          }
        }

        skillData.push({
          skill_id: s.skill_id,
          skill_name: s.skill_name,
          skill_level_achieved: currentLevel,
          avg_task_level_this_week: parseFloat(s.avg_task_skill_level),
          tasks_completed_count: parseInt(s.tasks_count)
        });
      }

      // Top task titles and project names
      const topTasksRes = await pool.query(`
        SELECT
          t.name as task_title,
          p.name as project_name,
          COALESCE(i.label, t.name) as impact_label,
          COALESCE(i.impact_weight, 0) as impact_weight,
          o.statement as outcome_statement
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        LEFT JOIN impact_nodes i ON i.type = 'task' AND i.entity_id = t.id
        LEFT JOIN impact_edges e ON e.from_node_id = i.id
        LEFT JOIN impact_nodes outcome_node ON outcome_node.id = e.to_node_id AND outcome_node.type = 'outcome'
        LEFT JOIN outcomes o ON o.id = outcome_node.entity_id
        WHERE t.submitted_by = $1 AND t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '7 days'
        ORDER BY COALESCE(i.impact_weight, 0) DESC, t.reward_tokens DESC
        LIMIT 5
      `, [userId]);

      // Guild names
      const guildsRes = await pool.query(`
        SELECT g.name
        FROM guilds g
        JOIN guild_memberships gm ON g.id = gm.guild_id
        WHERE gm.user_id = $1
      `, [userId]);

      // Constellation names
      const constellationsRes = await pool.query(`
        SELECT c.name
        FROM constellations c
        JOIN constellation_pledges cp ON c.id = cp.constellation_id
        WHERE cp.pledger_id = $1 AND cp.status = 'active'
      `, [userId]);

      return {
        user_id: userId,
        tasks: {
          this_week: parseInt(row.tasks_this_week) || 0,
          last_week: parseInt(row.tasks_last_week) || 0,
          avg_6_months: avgTasks6m,
          top_titles: topTasksRes.rows.map(r => `${r.task_title} (${r.project_name}) - ${r.impact_weight}% impact: ${r.impact_label}`),
          high_impact_tasks: topTasksRes.rows.map(r => ({
            task_title: r.task_title,
            project_name: r.project_name,
            impact_label: r.impact_label,
            impact_weight: parseInt(r.impact_weight) || 0,
            outcome_statement: r.outcome_statement
          }))
        },
        xp: {
          this_week: parseInt(row.xp_this_week) || 0,
          last_week: parseInt(row.xp_last_week) || 0,
          avg_6_months: avgXp6m
        },
        skills: skillData,
        guilds: guildsRes.rows.map(r => r.name),
        constellations: constellationsRes.rows.map(r => r.name)
      };
    } catch (err) {
      console.error(`Error getting stats for user ${userId}:`, err);
      return null;
    }
  }
}

export default new WeeklyWrapUpService();
