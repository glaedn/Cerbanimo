// backend/services/UserMatchingService.js

/**
 * UserMatchingService matches tasks to users using skills, history, and impact alignment.
 * Match on: skills, history, availability (implicit), verification track record, impact alignment.
 */
class UserMatchingService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Find top users for a given task.
   * @param {string} taskId
   * @param {number} limit
   * @returns {Promise<Array<Object>>}
   */
  async findTopUsersForTask(taskId, limit = 5) {
    const { rows: taskResult } = await this.db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.length === 0) return [];
    const task = taskResult[0];

    // SQL query to find users matching skills
    // In a real system, we'd add weights for story patterns (e.g. 'Finisher', 'Reviver')
    // and alignment with Outcome nodes (Phase 0).
    const { rows: users } = await this.db.query(
      `SELECT u.id, u.display_name, COUNT(us.skill_name) as skill_match_count
       FROM users u
       JOIN user_skills us ON u.id = us.user_id
       WHERE us.skill_name = ANY($1)
       GROUP BY u.id, u.display_name
       ORDER BY skill_match_count DESC, u.cotokens DESC
       LIMIT $2`,
      [task.skills || [], limit]
    );

    // After basic skill match, refine with Story patterns and Impact traces (Phase 0 & 5)
    for (const user of users) {
      user.match_score = await this.calculateMatchScore(user, task);
    }

    return users.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Calculates a match score for a user-task pair.
   * @param {Object} user
   * @param {Object} task
   * @returns {Promise<number>}
   */
  async calculateMatchScore(user, task) {
    let score = user.skill_match_count * 10;

    // 1. Story Pattern Alignment (Phase 5)
    // If user is a 'Finisher', they get a bonus for open tasks that were abandoned.
    const { rows: patterns } = await this.db.query(
      'SELECT archetype FROM user_patterns WHERE user_id = $1',
      [user.id]
    );
    const userPatterns = patterns.map(p => p.archetype);

    if (userPatterns.includes('Finisher') && task.previous_attempts > 0) score += 15;
    if (userPatterns.includes('Starter') && task.is_new_initiative) score += 10;
    if (userPatterns.includes('Reviver') && task.status === 'stalled') score += 20;

    // 2. Impact Alignment (Phase 0)
    // If user has traced contributions to this Outcome's category.
    const { rows: userImpacts } = await this.db.query(
      'SELECT outcome_category, contribution_depth FROM user_impact_summaries WHERE user_id = $1',
      [user.id]
    );

    const taskOutcomeCategory = task.outcome_category || 'general';
    const impactMatch = userImpacts.find(i => i.outcome_category === taskOutcomeCategory);
    if (impactMatch) {
      score += (impactMatch.contribution_depth * 5);
    }

    // 3. Verification Track Record (Phase 1)
    // High successful verification rate = higher reliability score.
    const { rows: verifStats } = await this.db.query(
      'SELECT successful_verifications, total_verifications FROM user_verification_stats WHERE user_id = $1',
      [user.id]
    );
    if (verifStats.length > 0) {
      const rate = verifStats[0].successful_verifications / (verifStats[0].total_verifications || 1);
      score += (rate * 10);
    }

    return score;
  }

  /**
   * Surface the "You are uniquely suited for this task" reason.
   * @param {Object} user
   * @param {Object} task
   * @returns {string}
   */
  async getReasoningForMatch(user, task) {
    // ... logic to return a string explaining why they are a match.
    // "You are uniquely suited for this task because you have completed 3 similar tasks
    // and have a strong alignment with urban food systems outcomes."
    return "Your unique skill set and past contributions to similar outcomes make you an ideal match.";
  }
}

export default UserMatchingService;
