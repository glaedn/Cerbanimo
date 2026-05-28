import pool from '../../db.js';

class TrustInferenceEngine {
  async updateReputation(userId, context) {
    // Logic to increment trust/reputation based on completed missions and social health
    const completedTasks = await pool.query(
      'SELECT count(*) FROM tasks WHERE $1 = ANY(assigned_user_ids) AND status = \'completed\'',
      [userId]
    );

    const count = parseInt(completedTasks.rows[0].count);
    let trustLevel = 1;
    if (count > 50) trustLevel = 4;
    else if (count > 20) trustLevel = 3;
    else if (count > 5) trustLevel = 2;

    await pool.query('UPDATE users SET trust_level = $1 WHERE id = $2', [trustLevel, userId]);

    return { status: 'stable', trend: 'positive', trustLevel };
  }
}

export default new TrustInferenceEngine();
