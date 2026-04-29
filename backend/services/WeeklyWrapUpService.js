import pool from '../db.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseLLMJsonResponse } from "./taskGenerator.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class WeeklyWrapUpService {
  async generateWeeklyWrapUps() {
    console.log('Starting weekly wrap-up generation...');

    try {
      // 1. Get active users (who completed tasks in the last 7 days)
      const activeUsersResult = await pool.query(`
        SELECT DISTINCT submitted_by as user_id
        FROM tasks
        WHERE completed_at > NOW() - INTERVAL '7 days'
        AND status = 'completed'
        AND submitted_by IS NOT NULL
      `);

      const userIds = activeUsersResult.rows.map(r => r.user_id);
      console.log(`Found ${userIds.length} active users.`);

      // Batching logic (20 users at a time)
      const batchSize = 20;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await this.processUserBatch(batch);
      }

      console.log('Weekly wrap-up generation complete.');
    } catch (err) {
      console.error('Failed to run weekly wrap-up generation:', err);
      throw err;
    }
  }

  async processUserBatch(userIds) {
    const userData = [];

    for (const userId of userIds) {
      const stats = await this.getUserWeeklyStats(userId);
      if (stats) {
        userData.push(stats);
      }
    }

    if (userData.length === 0) return;

    const prompt = `
      You are an expert AI Story Engine for a high-collaboration workspace platform.
      Your task is to generate a "Weekly Wrap-up" summary for each user based on their activity and growth data.

      Input Data (Batch of users and their stats):
      ${JSON.stringify(userData)}

      Instructions:
      - For each user, generate a "Story summary" (1-2 paragraphs) describing their week of work.
      - Analyze the data for trends, momentum, and skill growth patterns.
      - Compare this week's performance against last week and their 6-month average to identify improvements or shifts in focus.
      - Highlight positive achievements or offer constructive, encouraging insights about their activity.
      - Be creative, professional, and use a tone that feels like a chronicle of their journey.
      - Return a JSON array of objects, one for each user in the batch.

      Required Output Format:
      [
        {
          "user_id": 123,
          "content": "A story-like summary of the user's week...",
          "structured_data": {
             "weekly_momentum": "increasing/decreasing/stable",
             "top_skill_focus": "Skill Name",
             "growth_insight": "A short specific insight about their progress"
          }
        }
      ]

      - summary_type in the database will be 'weekly wrap-up'.
      - ONLY return the JSON array. Do not include any other text or markdown markers.
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const summaries = parseLLMJsonResponse(text);

      if (Array.isArray(summaries)) {
        for (const summary of summaries) {
          await pool.query(
            `INSERT INTO story_summaries (user_id, summary_type, content, structured_data)
             VALUES ($1, 'weekly wrap-up', $2, $3)`,
            [summary.user_id, summary.content, JSON.stringify(summary.structured_data || {})]
          );
        }
        console.log(`Successfully saved ${summaries.length} weekly wrap-ups.`);
      }
    } catch (err) {
      console.error("Error processing user batch with Gemini:", err);
    }
  }

  async getUserWeeklyStats(userId) {
    try {
      const statsQuery = `
        WITH weekly_stats AS (
          SELECT
            COUNT(*) as tasks_this_week,
            SUM(reward_tokens) as xp_this_week
          FROM tasks
          WHERE submitted_by = $1 AND status = 'completed' AND completed_at > NOW() - INTERVAL '7 days'
        ),
        last_week_stats AS (
          SELECT
            COUNT(*) as tasks_last_week,
            SUM(reward_tokens) as xp_last_week
          FROM tasks
          WHERE submitted_by = $1 AND status = 'completed'
          AND completed_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
        ),
        six_month_stats AS (
          SELECT
            COUNT(*) as total_tasks_6m,
            SUM(reward_tokens) as total_xp_6m,
            EXTRACT(EPOCH FROM (NOW() - MIN(completed_at))) / (7 * 24 * 3600) as weeks_elapsed
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
          AVG(t.skill_level) as avg_task_skill_level,
          COUNT(*) as tasks_count
        FROM tasks t
        JOIN skills s ON t.skill_id = s.id
        WHERE t.submitted_by = $1 AND t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '7 days'
        GROUP BY t.skill_id, s.name
      `, [userId]);

      const skillData = [];
      for (const s of skillStatsRes.rows) {
        // Get user's current level in this skill from the unlocked_users array
        const skillLevelQuery = await pool.query(`
          SELECT
            elem->>'level' as current_level
          FROM skills,
          jsonb_array_elements(unlocked_users) AS elem
          WHERE id = $1 AND elem->>'user_id' = $2::text
        `, [s.skill_id, userId]);

        skillData.push({
          skill_id: s.skill_id,
          skill_name: s.skill_name,
          skill_level_achieved: parseInt(skillLevelQuery.rows[0]?.current_level) || 0,
          avg_task_level_this_week: parseFloat(s.avg_task_skill_level),
          tasks_completed_count: parseInt(s.tasks_count)
        });
      }

      return {
        user_id: userId,
        tasks: {
          this_week: parseInt(row.tasks_this_week) || 0,
          last_week: parseInt(row.tasks_last_week) || 0,
          avg_6_months: avgTasks6m
        },
        xp: {
          this_week: parseInt(row.xp_this_week) || 0,
          last_week: parseInt(row.xp_last_week) || 0,
          avg_6_months: avgXp6m
        },
        skills: skillData
      };
    } catch (err) {
      console.error(`Error getting stats for user ${userId}:`, err);
      return null;
    }
  }
}

export default new WeeklyWrapUpService();
