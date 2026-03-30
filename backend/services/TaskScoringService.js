// backend/services/TaskScoringService.js

/**
 * TaskScoringService calculates priority and dynamic rewards for tasks.
 * Inputs: age, dependency, skill scarcity, impact depth.
 */
class TaskScoringService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Calculates the overall priority score for a task.
   * @param {Object} task
   * @returns {Promise<number>}
   */
  async calculatePriorityScore(task) {
    let score = 0;

    // 1. Impact Depth (Phase 0)
    // Closer to outcome = higher priority.
    // impact_depth 1 is direct child of outcome, 2 is grandchild, etc.
    const impactBonus = task.impact_depth > 0 ? (10 / task.impact_depth) : 1;
    score += impactBonus;

    // 2. Age of task
    const hoursOld = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
    const ageBonus = Math.min(hoursOld / 24, 5); // Max 5 points for being 5+ days old
    score += ageBonus;

    // 3. Skill Scarcity
    // Find how many users have the required skills
    if (task.skills && task.skills.length > 0) {
      const { rows } = await this.db.query(
        'SELECT count(DISTINCT user_id) FROM user_skills WHERE skill_name = ANY($1)',
        [task.skills]
      );
      const userCount = parseInt(rows[0].count);
      const scarcityBonus = userCount < 5 ? (10 / (userCount + 1)) : 0;
      score += scarcityBonus;
    }

    // 4. Dependency Weight
    // (Mocking this for now as we don't have a formal dependency table yet)
    // In a real system, count tasks that have this task as a prerequisite.
    const dependencyBonus = task.is_critical ? 5 : 0;
    score += dependencyBonus;

    return parseFloat(score.toFixed(2));
  }

  /**
   * Calculates dynamic reward based on task age and priority.
   * "Dynamic Reward Adjustment: Increase rewards for aging tasks... bounded at 3x base."
   * @param {Object} task
   * @returns {number}
   */
  calculateDynamicReward(task) {
    const baseReward = task.base_reward || 100;
    const rewardFloor = task.reward_floor || baseReward;
    const rewardCeiling = task.reward_ceiling || (baseReward * 3);

    const hoursOld = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);

    // Increase by 1% per hour old, up to the ceiling
    let dynamicReward = baseReward * (1 + (hoursOld * 0.01));

    return Math.min(Math.max(dynamicReward, rewardFloor), rewardCeiling);
  }

  async updateTaskScores() {
    const { rows: tasks } = await this.db.query('SELECT * FROM tasks WHERE status = \'open\'');

    for (const task of tasks) {
      const priority_score = await this.calculatePriorityScore(task);
      const dynamic_reward = this.calculateDynamicReward(task);

      await this.db.query(
        'UPDATE tasks SET priority_score = $1, current_reward = $2 WHERE id = $3',
        [priority_score, dynamic_reward, task.id]
      );
    }
  }
}

export default TaskScoringService;
