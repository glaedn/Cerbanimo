import pool from '../db.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

class StoryEngineService {
  async createStoryUnit(taskId, userId, role = 'implementer') {
    const query = `
      SELECT t.*, p.community_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1;
    `;
    const result = await pool.query(query, [taskId]);
    const task = result.rows[0];

    // Complexity derived from reward_tokens / 100
    const complexity = Math.min(task.reward_tokens / 100, 1.0);
    // Impact Weight derived from impact_depth / 10
    const impactWeight = Math.min(task.impact_depth / 10, 1.0);

    // Skill tags from skill_id
    const skillNameQuery = await pool.query('SELECT name FROM skills WHERE id = $1', [task.skill_id]);
    const skillTags = [skillNameQuery.rows[0]?.name].filter(Boolean);

    // Dependencies unblocked
    const unblockedQuery = await pool.query('SELECT count(*) FROM tasks WHERE $1 = ANY(dependencies)', [taskId]);
    const dependenciesUnblocked = parseInt(unblockedQuery.rows[0].count);

    // Completion time
    const completionTime = new Date(task.completed_at) - new Date(task.accepted_at);

    const insertQuery = `
      INSERT INTO story_units (user_id, task_id, project_id, skill_tags, role, complexity, impact_weight, dependencies_unblocked, task_type, completion_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const unitResult = await pool.query(insertQuery, [
      userId, taskId, task.project_id, skillTags, role, complexity, impactWeight, dependenciesUnblocked, task.task_type, completionTime
    ]);
    const unit = unitResult.rows[0];

    // Trigger Pattern Detection
    await this.detectUserPatterns(userId);

    return unit;
  }

  async detectUserPatterns(userId) {
    const unitsQuery = 'SELECT * FROM story_units WHERE user_id = $1';
    const unitsResult = await pool.query(unitsQuery, [userId]);
    const units = unitsResult.rows;

    const patterns = {
      'Finisher': 0,
      'Starter': 0,
      'Reviver': 0,
      'Specialist': 0,
      'Connector': 0,
      'Verifier': 0
    };

    if (units.length > 0) {
      // Specialist: Many units in same skill tags
      const skillCounts = {};
      units.forEach(u => {
        u.skill_tags.forEach(tag => {
           skillCounts[tag] = (skillCounts[tag] || 0) + 1;
        });
      });
      const maxSkills = Math.max(...Object.values(skillCounts));
      patterns['Specialist'] = Math.min(maxSkills / units.length, 1.0);

      // Finisher: High completion rate for units that have high complexity
      const finisherScore = units.reduce((acc, u) => acc + (u.complexity > 0.5 ? 1 : 0.5), 0) / units.length;
      patterns['Finisher'] = Math.min(finisherScore, 1.0);

      // Reviver: Works on tasks with high decay_factor (need join tasks)
      const tasksWithDecay = await pool.query(
        'SELECT count(*) FROM tasks t JOIN story_units su ON t.id = su.task_id WHERE su.user_id = $1 AND t.decay_factor > 1.5',
        [userId]
      );
      patterns['Reviver'] = Math.min(parseInt(tasksWithDecay.rows[0].count) / 5, 1.0);

      // Connector: Works in constellations
      const constellationTasks = await pool.query(
        'SELECT count(*) FROM constellation_tasks ct JOIN story_units su ON ct.task_id = su.task_id WHERE su.user_id = $1',
        [userId]
      );
      patterns['Connector'] = Math.min(parseInt(constellationTasks.rows[0].count) / 3, 1.0);

      // Verifier: High rate of successful verifications
      const verifications = await pool.query(
        'SELECT count(*) FROM verification_events WHERE verifier_id = $1 AND status = \'approved\'',
        [userId]
      );
      patterns['Verifier'] = Math.min(parseInt(verifications.rows[0].count) / 10, 1.0);
    }

    // Update patterns in DB
    const upsertPromises = Object.entries(patterns).map(([name, strength]) => {
      return pool.query(
        `INSERT INTO user_patterns (user_id, pattern, strength)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, pattern) DO UPDATE SET strength = $3, updated_at = NOW()`,
        [userId, name, strength]
      );
    });
    await Promise.all(upsertPromises);
  }

  async generateMicroNarrative(unitId) {
    const unitQuery = 'SELECT * FROM story_units WHERE id = $1';
    const unitResult = await pool.query(unitQuery, [unitId]);
    const unit = unitResult.rows[0];

    const prompt = `Interpret the following structured data into a concise micro-narrative for a user portfolio:
    - Skill Tags: ${unit.skill_tags.join(', ')}
    - Role: ${unit.role}
    - Complexity: ${unit.complexity} (0-1)
    - Impact Weight: ${unit.impact_weight} (0-1)
    - Dependencies Unblocked: ${unit.dependencies_unblocked}
    - Task Type: ${unit.task_type}

    Example: "Implemented a data visualization feature that unlocked 2 dependent tasks and accelerated project momentum."
    Micro-narrative:`;

    const response = await model.generateContent(prompt);
    const content = response.response.text().trim();

    await pool.query(
      'INSERT INTO story_summaries (user_id, summary_type, content, structured_data) VALUES ($1, $2, $3, $4)',
      [unit.user_id, 'micro', content, JSON.stringify(unit)]
    );

    // Update story_nodes with the narrative
    await pool.query(
      'UPDATE story_nodes SET reflection = reflection || $1 WHERE task_id = $2 AND user_id = $3',
      [`\n\nAI Narrative: ${content}`, unit.task_id, unit.user_id]
    );

    return content;
  }
}

export default new StoryEngineService();
