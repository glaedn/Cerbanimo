import pool from '../db.js';

class TrustEvaluationService {
  /**
   * Evaluates and updates the trust level for a user.
   * @param {number} userId
   * @returns {Promise<number>}
   */
  async evaluateTrust(userId) {
    const client = await pool.connect();
    try {
      const [tasksRes, reviewsRes] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM tasks WHERE assigned_user_id = $1 AND status = \'completed\'', [userId]),
        client.query('SELECT COUNT(*) as count FROM tasks WHERE creator_id = $1 AND status = \'completed\'', [userId])
      ]);

      const completedCount = parseInt(tasksRes.rows[0].count);
      const reviewedCount = parseInt(reviewsRes.rows[0].count);

      let trustScore = 1;
      if (completedCount >= 5) trustScore = 2;
      if (completedCount >= 20 && reviewedCount >= 5) trustScore = 3;
      if (completedCount >= 50 && reviewedCount >= 15) trustScore = 4;
      if (completedCount >= 100 && reviewedCount >= 30) trustScore = 5;

      await client.query('UPDATE users SET trust_level = $1 WHERE id = $2', [trustScore, userId]);
      return trustScore;
    } finally {
      client.release();
    }
  }
}

export default new TrustEvaluationService();
