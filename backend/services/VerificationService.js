import pool from '../db.js';
import { calculateVoteWeight } from '../utils/voteWeight.js';
import CivicEventService from './CivicEventService.js';
import WorldGraphService from './WorldGraphService.js';

const CHALLENGE_STAKE = 1;

class VerificationService {
  async recordVerificationEvent(taskId, verifierId, status, proofOfWorkLink = null, verificationType = null, needId = null) {
    const query = `
      INSERT INTO verification_events (
        task_id,
        verifier_id,
        status,
        proof_of_work_link,
        verification_type,
        need_id,
        challenge_window_expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '72 hours')
      RETURNING *;
    `;
    const result = await pool.query(query, [taskId, verifierId, status, proofOfWorkLink, verificationType, needId]);
    const verificationEvent = result.rows[0];

    if (taskId && verifierId) {
      await this.recordValidationHistory({
        validatorId: verifierId,
        taskId,
        eventType: verificationType || `verification:${status}`,
        weightApplied: 1
      }).catch(err => console.error('Failed to record validation history:', err));
    }

    // Randomly enqueue for audit (~10%)
    if (Math.random() < 0.1) {
      await pool.query(
        'INSERT INTO audit_queue (verification_id, triggered_at, status) VALUES ($1, NOW(), $2)',
        [verificationEvent.id, 'pending']
      ).catch(err => console.error('Failed to enqueue audit:', err));
    }

    // Record Event
    await CivicEventService.recordEvent({
      eventType: 'impact.verified',
      actorId: verifierId,
      entityType: taskId ? 'task' : 'need',
      entityId: taskId || needId,
      payload: {
        status,
        verificationType,
        verificationEventId: verificationEvent.id
      },
      correlationId: taskId ? `task:${taskId}` : `need:${needId}`
    }).catch(err => console.error('Failed to record impact.verified event:', err));

    return verificationEvent;
  }

  async recordValidationHistory({ validatorId, subjectId = null, taskId = null, eventType = 'verification', weightApplied = 1, client = pool }) {
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId && taskId) {
      const taskResult = await client.query('SELECT submitted_by FROM tasks WHERE id = $1', [taskId]);
      resolvedSubjectId = taskResult.rows[0]?.submitted_by;
    }

    if (!validatorId || !resolvedSubjectId) return null;

    const result = await client.query(
      `INSERT INTO validation_history (validator_id, subject_id, event_type, weight_applied, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [validatorId, resolvedSubjectId, eventType, weightApplied]
    );
    return result.rows[0];
  }

  async getValidationFrequency(validatorId, subjectId, client = pool) {
    if (!validatorId || !subjectId) return 0;
    const result = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM validation_history
       WHERE validator_id = $1 AND subject_id = $2`,
      [validatorId, subjectId]
    );
    return result.rows[0]?.count || 0;
  }

  async getWorldGraphDistance(validatorId, subjectId) {
    try {
      const neighborhood = await WorldGraphService.getEntityNeighborhood('person', subjectId, 3);
      const serializedValidatorId = String(validatorId);
      const matched = neighborhood.find((row) => JSON.stringify(row).includes(serializedValidatorId));
      return matched ? 2 : 3;
    } catch (err) {
      console.warn('WorldGraph distance fallback used:', err.message);
      return 3;
    }
  }

  distanceMultiplier(distance) {
    if (distance >= 3) return 1.25;
    if (distance === 2) return 1;
    if (distance === 1) return 0.65;
    return 0.5;
  }

  async scoreValidator({ validatorId, subjectId, base = 1, client = pool }) {
    const [frequency, distance] = await Promise.all([
      this.getValidationFrequency(validatorId, subjectId, client),
      this.getWorldGraphDistance(validatorId, subjectId)
    ]);

    const weight = base * this.distanceMultiplier(distance) / (1 + Math.log(1 + frequency));
    return {
      validatorId,
      subjectId,
      distance,
      frequency,
      weight
    };
  }

  async selectValidators({ taskId, excludeUserIds = [], limit = 3, minTrustLevel = 1, client = pool }) {
    const taskResult = await client.query(
      'SELECT submitted_by, assigned_user_ids, skill_id FROM tasks WHERE id = $1',
      [taskId]
    );
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found for validator selection');
    }

    const task = taskResult.rows[0];
    const excluded = [
      ...(excludeUserIds || []),
      ...(task.assigned_user_ids || []),
      task.submitted_by
    ].filter(Boolean).map(Number);

    const candidatesResult = await client.query(
      `SELECT DISTINCT u.id, u.trust_level
       FROM users u
       LEFT JOIN guild_memberships gm ON gm.user_id = u.id
       LEFT JOIN guilds g ON g.id = gm.guild_id
       WHERE u.discord_user_id IS NOT NULL
         AND u.trust_level >= $1
         AND NOT (u.id = ANY($2::int[]))
         AND ($3::int IS NULL OR g.skill_id = $3 OR gm.user_id IS NULL)
       LIMIT 100`,
      [minTrustLevel, excluded.length ? excluded : [-1], task.skill_id || null]
    );

    const scored = await Promise.all(
      candidatesResult.rows.map((candidate) =>
        this.scoreValidator({
          validatorId: candidate.id,
          subjectId: task.submitted_by,
          base: Math.max(candidate.trust_level || 1, 1),
          client
        })
      )
    );

    return scored
      .sort((a, b) => {
        const distancePreference = Number(b.distance >= 2) - Number(a.distance >= 2);
        if (distancePreference !== 0) return distancePreference;
        return b.weight - a.weight;
      })
      .slice(0, limit);
  }

  async openChallenge(verificationId, challengerId, reason = '') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const verificationResult = await client.query(
        `SELECT ve.*, t.assigned_user_ids, t.submitted_by
         FROM verification_events ve
         LEFT JOIN tasks t ON t.id = ve.task_id
         WHERE ve.id = $1 FOR UPDATE`,
        [verificationId]
      );

      if (verificationResult.rows.length === 0) {
        const error = new Error('Verification not found');
        error.status = 404;
        throw error;
      }

      const verification = verificationResult.rows[0];
      if (!verification.challenge_window_expires_at || new Date(verification.challenge_window_expires_at) < new Date()) {
        const error = new Error('Challenge window has closed');
        error.status = 400;
        throw error;
      }

      const balanceResult = await client.query(
        'SELECT cotokens FROM users WHERE id = $1 AND discord_user_id IS NOT NULL FOR UPDATE',
        [challengerId]
      );
      if (balanceResult.rows.length === 0 || Number(balanceResult.rows[0].cotokens || 0) < CHALLENGE_STAKE) {
        const error = new Error('Discord-linked challenger with sufficient trust stake required');
        error.status = 403;
        throw error;
      }

      await client.query(
        'UPDATE users SET cotokens = cotokens - $1 WHERE id = $2',
        [CHALLENGE_STAKE, challengerId]
      );

      const originalVerifierIds = verification.task_id
        ? (await client.query('SELECT verifier_id FROM verification_events WHERE task_id = $1', [verification.task_id])).rows.map(row => row.verifier_id).filter(Boolean)
        : [verification.verifier_id].filter(Boolean);

      const secondaryValidators = verification.task_id
        ? await this.selectValidators({
            taskId: verification.task_id,
            excludeUserIds: [...originalVerifierIds, challengerId],
            limit: 3,
            minTrustLevel: 2,
            client
          })
        : [];

      const updateResult = await client.query(
        `UPDATE verification_events
         SET challenged_at = NOW(),
             challenger_id = $2,
             challenge_stake = $3,
             secondary_review_status = 'pending'
         WHERE id = $1
         RETURNING *`,
        [verificationId, challengerId, CHALLENGE_STAKE]
      );

      if (verification.task_id && secondaryValidators.length > 0) {
        await client.query(
          'UPDATE tasks SET reviewer_ids = $1, status = $2 WHERE id = $3',
          [secondaryValidators.map(v => v.validatorId), 'under-challenge', verification.task_id]
        );
      }

      await CivicEventService.recordEvent({
        eventType: 'verification.challenged',
        actorId: challengerId,
        entityType: verification.task_id ? 'task' : 'verification',
        entityId: verification.task_id || verificationId,
        payload: {
          verificationId,
          reason,
          stake: CHALLENGE_STAKE,
          secondaryValidators
        },
        correlationId: verification.task_id ? `task:${verification.task_id}` : `verification:${verificationId}`
      }, client).catch(err => console.error('Failed to record verification.challenged event:', err));

      await client.query('COMMIT');
      return { verification: updateResult.rows[0], secondaryValidators };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async applyDisputeResolution({ taskId, overturned, client = pool }) {
    if (!taskId || !overturned) return { adjustedValidators: [] };

    const verifierResult = await client.query(
      `SELECT verifier_id, COALESCE(accuracy_score, 1) AS weight
       FROM verification_events
       WHERE task_id = $1 AND status = 'approved' AND verifier_id IS NOT NULL`,
      [taskId]
    );

    const adjustedValidators = [];
    for (const verifier of verifierResult.rows) {
      const penalty = Math.max(Number(verifier.weight || 1), 0.25);
      await client.query(
        'UPDATE users SET trust_level = GREATEST(1, trust_level - CEIL($1)::int) WHERE id = $2',
        [penalty, verifier.verifier_id]
      );
      adjustedValidators.push({ validatorId: verifier.verifier_id, penalty });
    }

    return { adjustedValidators };
  }

  async validateOracleLink(url) {
    if (!url) return false;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (err) {
      console.error('Oracle link validation failed:', err);
      return false;
    }
  }

  async getVerificationHistory(userId) {
    const query = `
      SELECT ve.*, t.name as task_name
      FROM verification_events ve
      JOIN tasks t ON ve.task_id = t.id
      WHERE ve.verifier_id = $1 OR t.submitted_by = $1
      ORDER BY ve.created_at DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async detectBadActors(userId) {
    const flags = [];

    // 1. Unusual self-verification clustering (>3 in 24h)
    const selfVerificationQuery = `
      SELECT COUNT(*) FROM verification_events ve
      JOIN tasks t ON ve.task_id = t.id
      WHERE ve.verifier_id = $1
      AND t.submitted_by = $1
      AND ve.created_at > NOW() - INTERVAL '24 hours'
    `;
    const selfRes = await pool.query(selfVerificationQuery, [userId]);
    if (parseInt(selfRes.rows[0].count) > 3) {
      flags.push({ type: 'self_verification_cluster', count: selfRes.rows[0].count });
    }

    // 2. Verifier collusion (high rate of mutual approvals in last 30 days)
    // Find pairs where A approved B and B approved A
    const collusionQuery = `
      SELECT t.submitted_by as other_user_id, COUNT(*) as approval_count
      FROM verification_events ve
      JOIN tasks t ON ve.task_id = t.id
      WHERE ve.verifier_id = $1
      AND ve.status = 'approved'
      AND t.submitted_by != $1
      AND ve.created_at > NOW() - INTERVAL '30 days'
      GROUP BY t.submitted_by
      HAVING COUNT(*) > 5
    `;
    const collusionRes = await pool.query(collusionQuery, [userId]);
    for (const row of collusionRes.rows) {
       // Check if the other user also approved this user's tasks
       const reverseQuery = `
         SELECT COUNT(*) FROM verification_events ve
         JOIN tasks t ON ve.task_id = t.id
         WHERE ve.verifier_id = $1
         AND t.submitted_by = $2
         AND ve.status = 'approved'
       `;
       const reverseRes = await pool.query(reverseQuery, [row.other_user_id, userId]);
       if (parseInt(reverseRes.rows[0].count) > 0) {
          flags.push({ type: 'collusion_pattern', target_user_id: row.other_user_id, count: row.approval_count });
       }
    }

    return flags;
  }
}

class DisputeService {
  async openDispute(taskId, openerId, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO disputes (task_id, opener_id, reason, status)
        VALUES ($1, $2, $3, 'review')
        RETURNING *;
      `;
      const disputeResult = await client.query(insertQuery, [taskId, openerId, reason]);
      const dispute = disputeResult.rows[0];

      // Update task status and hold reward
      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['under-dispute', taskId]
      );

      // Trigger juror selection
      await this.selectJurors(dispute.id, taskId);

      await client.query('COMMIT');
      return dispute;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async openDissolutionDispute(constellationId, taskId, openerId, reason) {
    // Phase 3: Mini-dispute protocol for rewards for partial work in dissolved constellations
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO disputes (task_id, opener_id, reason, status)
        VALUES ($1, $2, $3, 'review')
        RETURNING *;
      `;
      const disputeResult = await client.query(insertQuery, [taskId, openerId, reason]);
      const dispute = disputeResult.rows[0];

      // Select 3 random jurors from guilds participating in the constellation
      const jurorsQuery = `
        SELECT DISTINCT gm.user_id
        FROM constellation_members cm
        JOIN guilds g ON cm.entity_id = g.id AND cm.entity_type = 'guild'
        JOIN guild_memberships gm ON gm.guild_id = g.id
        WHERE cm.constellation_id = $1
        ORDER BY RANDOM() LIMIT 3
      `;
      const jurorsRes = await client.query(jurorsQuery, [constellationId]);
      let jurors = jurorsRes.rows.map(r => r.user_id);

      // Fallback to general selectJurors logic if needed
      if (jurors.length < 3) {
          // Placeholder for fallback or simple union
          const anyUsers = await client.query("SELECT id FROM users WHERE id != $1 ORDER BY RANDOM() LIMIT $2", [openerId, 3 - jurors.length]);
          jurors = jurors.concat(anyUsers.rows.map(r => r.id));
      }

      await client.query(
        'UPDATE disputes SET jurors = $1, juror_selection_status = \'selected\' WHERE id = $2',
        [jurors, dispute.id]
      );

      await client.query('COMMIT');
      return dispute;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async selectJurors(disputeId, taskId) {
    // 1. Find the skill guild for the task
    const taskQuery = 'SELECT skill_id FROM tasks WHERE id = $1';
    const taskRes = await pool.query(taskQuery, [taskId]);
    const skillId = taskRes.rows[0].skill_id;

    let jurors = [];

    // 2. Look for 3 random guild members
    const guildJurors = await pool.query(
      `SELECT user_id FROM guild_memberships WHERE guild_id = (SELECT id FROM guilds WHERE skill_id = $1)
       ORDER BY RANDOM() LIMIT 3`,
      [skillId]
    );
    jurors = guildJurors.rows.map(r => r.user_id);

    // 3. If not enough, fill with any skill guild members
    if (jurors.length < 3) {
      const otherGuildJurors = await pool.query(
        `SELECT user_id FROM guild_memberships WHERE NOT (user_id = ANY($1))
         ORDER BY RANDOM() LIMIT $2`,
        [jurors.length > 0 ? jurors : [-1], 3 - jurors.length]
      );
      jurors = jurors.concat(otherGuildJurors.rows.map(r => r.user_id));
    }

    // 4. If still not enough, fill with any users
    if (jurors.length < 3) {
      const anyUsers = await pool.query(
        `SELECT id FROM users WHERE NOT (id = ANY($1))
         ORDER BY RANDOM() LIMIT $2`,
        [jurors.length > 0 ? jurors : [-1], 3 - jurors.length]
      );
      jurors = jurors.concat(anyUsers.rows.map(r => r.id));
    }

    await pool.query(
      'UPDATE disputes SET jurors = $1, juror_selection_status = \'selected\' WHERE id = $2',
      [jurors, disputeId]
    );
  }

  async castVote(disputeId, voterId, vote, splitPercentage = 0, comment = '') {
    const query = `
      INSERT INTO dispute_votes (dispute_id, voter_id, vote, split_percentage, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (dispute_id, voter_id) DO UPDATE SET vote = $3, split_percentage = $4, comment = $5
      RETURNING *;
    `;
    const result = await pool.query(query, [disputeId, voterId, vote, splitPercentage, comment]);

    // Check for resolution
    const votesRes = await pool.query('SELECT COUNT(*) FROM dispute_votes WHERE dispute_id = $1', [disputeId]);
    if (parseInt(votesRes.rows[0].count) >= 3) {
       await this.resolveDispute(disputeId);
    }

    return result.rows[0];
  }

  async resolveDispute(disputeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const disputeRes = await client.query('SELECT task_id FROM disputes WHERE id = $1', [disputeId]);
      const taskId = disputeRes.rows[0].task_id;
      const projectRes = await client.query('SELECT community_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = $1', [taskId]);
      const communityId = projectRes.rows[0].community_id;

      const votesQuery = 'SELECT voter_id, vote, split_percentage FROM dispute_votes WHERE dispute_id = $1';
      const votesResult = await client.query(votesQuery, [disputeId]);

      let outcomeWeights = { uphold: 0, overturn: 0, split: 0 };
      let sumSplitPerc = 0;
      let totalWeight = 0;

      for (const row of votesResult.rows) {
        let weight = 1; // Default
        if (communityId) {
           const { weight: w } = await calculateVoteWeight(client, communityId, row.voter_id);
           weight = w;
        }

        outcomeWeights[row.vote] += weight;
        totalWeight += weight;

        if (row.vote === 'split') {
          sumSplitPerc += (parseFloat(row.split_percentage) * weight);
        }
      }

      let outcome = 'split';
      let maxWeight = -1;
      for (const [o, w] of Object.entries(outcomeWeights)) {
        if (w > maxWeight) {
          maxWeight = w;
          outcome = o;
        }
      }

      let avgSplit = 0;
      if (outcome === 'split' && outcomeWeights.split > 0) {
        avgSplit = sumSplitPerc / outcomeWeights.split;
      }

      const updateQuery = `
        UPDATE disputes SET status = 'resolved', outcome = $1, split_percentage = $2, resolved_at = NOW()
        WHERE id = $3 RETURNING *;
      `;
      const disputeResult = await client.query(updateQuery, [outcome, avgSplit, disputeId]);
      const dispute = disputeResult.rows[0];

      // Finalize task status based on outcome
      let finalTaskStatus = outcome === 'uphold' ? 'completed' : (outcome === 'overturn' ? 'active-assigned' : 'completed');

      // If split, we might need logic to distribute partial reward.
      // For now, mark completed and record outcome.
      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        [finalTaskStatus, dispute.task_id]
      );

      if (outcome === 'overturn') {
        await verificationService.applyDisputeResolution({
          taskId: dispute.task_id,
          overturned: true,
          client
        });
      }

      await client.query('COMMIT');
      return dispute;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const verificationService = new VerificationService();
export const disputeService = new DisputeService();
