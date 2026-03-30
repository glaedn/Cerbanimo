// backend/services/DecayService.js

/**
 * DecayService handles task reward escalation and visibility filtering for inactive projects.
 * Tasks in decay are surfaced as revival candidates.
 */
class DecayService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * Increases rewards and visibility for aging/critical tasks.
   * Bounded at 3x base reward (from Phase 4 logic).
   * @param {Object} task
   */
  async processTaskDecay(task) {
    // 1. Task reward escalation (Phase 4 integration)
    // Reward increases by 1% per hour old, up to the 3x ceiling.
    const hoursOld = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
    const decayMultiplier = 1 + (hoursOld * 0.01);

    // 2. Visibility Filtering (Phase 7)
    // Surface as revival candidate if it's been open for more than a week.
    const isRevivalCandidate = hoursOld > (24 * 7);

    await this.db.query(
      `UPDATE tasks SET
        decay_multiplier = $1,
        is_revival_candidate = $2
       WHERE id = $3`,
      [decayMultiplier, isRevivalCandidate, task.id]
    );
  }

  /**
   * Revive a stalled project/task (Phase 7).
   * @param {string} taskId
   * @param {string} userId
   */
  async reviveTask(taskId, userId) {
    // 1. Reset task status and credit the contributor who restarted it.
    await this.db.query(
      'UPDATE tasks SET status = \'open\', is_revived = true, reviver_id = $1 WHERE id = $2',
      [userId, taskId]
    );

    // 2. Revival event in the Story Engine (Phase 7 & 5)
    await this.db.query(
      `INSERT INTO user_stories (user_id, story_type, summary)
       VALUES ($1, 'revival_event', $2)`,
      [userId, `You revived a stalled task (${taskId}) and restarted its progress.`]
    );

    // 3. Revival is a legible, honorable act (Reputation bonus)
    await this.db.query(
      'UPDATE users SET cotokens = cotokens + 50 WHERE id = $1',
      [userId]
    );
  }

  async runDecayCycle() {
    const { rows: openTasks } = await this.db.query('SELECT * FROM tasks WHERE status = \'open\'');
    for (const task of openTasks) {
      await this.processTaskDecay(task);
    }
  }
}

export default DecayService;
