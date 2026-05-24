import pool from '../db.js';

class TrustEvaluationService {
  async getRecencyConcentration(userId, client = pool) {
    const result = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '24 hours')::int AS count_last_24h,
         COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '30 days')::int AS count_last_30d
       FROM tasks
       WHERE $1 = ANY(assigned_user_ids)
         AND status = 'completed'
         AND completed_at IS NOT NULL`,
      [userId]
    );

    const countLast24h = result.rows[0]?.count_last_24h || 0;
    const countLast30d = result.rows[0]?.count_last_30d || 0;
    const ratio = countLast30d > 0 ? countLast24h / countLast30d : 0;

    return { countLast24h, countLast30d, ratio };
  }

  getBurstDecayMultiplier(recencyConcentration) {
    if (recencyConcentration <= 0.4) return 1;
    return Math.max(0.25, 1 - (recencyConcentration - 0.4));
  }

  async getValidationFrequencyMultiplier(validatorId, subjectId, client = pool) {
    if (!validatorId || !subjectId) return 1;
    const result = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM validation_history
       WHERE validator_id = $1 AND subject_id = $2`,
      [validatorId, subjectId]
    );
    const nextValidationNumber = (result.rows[0]?.count || 0) + 1;
    return 1 / Math.sqrt(nextValidationNumber);
  }

  async calculateTrustDelta({
    userId,
    baseDelta = 1,
    validatorId = null,
    subjectId = null,
    client = pool
  }) {
    const concentration = await this.getRecencyConcentration(userId, client);
    const burstMultiplier = this.getBurstDecayMultiplier(concentration.ratio);
    const frequencyMultiplier = validatorId && subjectId
      ? await this.getValidationFrequencyMultiplier(validatorId, subjectId, client)
      : 1;

    return {
      baseDelta,
      appliedDelta: baseDelta * burstMultiplier * frequencyMultiplier,
      burstMultiplier,
      frequencyMultiplier,
      recencyConcentration: concentration.ratio,
      countLast24h: concentration.countLast24h,
      countLast30d: concentration.countLast30d
    };
  }

  async applyTrustDelta({
    userId,
    baseDelta = 1,
    validatorId = null,
    subjectId = null,
    reason = 'trust_delta',
    client = pool
  }) {
    const delta = await this.calculateTrustDelta({ userId, baseDelta, validatorId, subjectId, client });
    await client.query(
      `UPDATE users
       SET trust_level = GREATEST(1, trust_level + FLOOR($1)::int)
       WHERE id = $2`,
      [delta.appliedDelta, userId]
    );
    await client.query(
      `INSERT INTO validation_history (validator_id, subject_id, event_type, weight_applied, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [validatorId, subjectId || userId, reason, delta.appliedDelta]
    );
    return delta;
  }

  /**
   * Evaluates and updates the trust level for a user.
   * @param {number} userId
   * @returns {Promise<number>}
   */
  async evaluateTrust(userId) {
    const client = await pool.connect();
    try {
      const [tasksRes, reviewsRes] = await Promise.all([
        client.query(
          `SELECT COUNT(*) AS count
           FROM tasks
           WHERE $1 = ANY(assigned_user_ids)
             AND status = 'completed'`,
          [userId]
        ),
        client.query(
          `SELECT COUNT(*) AS count
           FROM verification_events
           WHERE verifier_id = $1
             AND status = 'approved'`,
          [userId]
        )
      ]);

      const completedCount = parseInt(tasksRes.rows[0].count, 10);
      const reviewedCount = parseInt(reviewsRes.rows[0].count, 10);

      let trustScore = 1;
      if (completedCount >= 5) trustScore = 2;
      if (completedCount >= 20 && reviewedCount >= 5) trustScore = 3;
      if (completedCount >= 50 && reviewedCount >= 15) trustScore = 4;
      if (completedCount >= 100 && reviewedCount >= 30) trustScore = 5;

      const concentration = await this.getRecencyConcentration(userId, client);
      const burstMultiplier = this.getBurstDecayMultiplier(concentration.ratio);
      const adjustedTrustScore = Math.max(1, Math.floor(1 + ((trustScore - 1) * burstMultiplier)));

      await client.query('UPDATE users SET trust_level = $1 WHERE id = $2', [adjustedTrustScore, userId]);
      await client.query(
        `INSERT INTO validation_history (validator_id, subject_id, event_type, weight_applied, created_at)
         VALUES (NULL, $1, 'trust_evaluation_burst_multiplier', $2, NOW())`,
        [userId, burstMultiplier]
      );
      return adjustedTrustScore;
    } finally {
      client.release();
    }
  }
}

export default new TrustEvaluationService();
