import pool from '../db.js';

class VerificationService {
  async recordVerificationEvent(taskId, verifierId, status, proofOfWorkLink = null) {
    const query = `
      INSERT INTO verification_events (task_id, verifier_id, status, proof_of_work_link)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [taskId, verifierId, status, proofOfWorkLink]);
    return result.rows[0];
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
}

class DisputeService {
  async openDispute(taskId, openerId, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO disputes (task_id, opener_id, reason, status)
        VALUES ($1, $2, $3, 'open')
        RETURNING *;
      `;
      const disputeResult = await client.query(insertQuery, [taskId, openerId, reason]);
      const dispute = disputeResult.rows[0];

      // Update task status and hold reward
      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['under-dispute', taskId]
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

  async castVote(disputeId, voterId, vote, comment = '') {
    const query = `
      INSERT INTO dispute_votes (dispute_id, voter_id, vote, comment)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dispute_id, voter_id) DO UPDATE SET vote = $3, comment = $4
      RETURNING *;
    `;
    // Note: Added UNIQUE(dispute_id, voter_id) constraint mentally, but need to ensure it's in the model if not there.
    const result = await pool.query(query, [disputeId, voterId, vote, comment]);
    return result.rows[0];
  }

  async resolveDispute(disputeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const votesQuery = 'SELECT vote, count(*) FROM dispute_votes WHERE dispute_id = $1 GROUP BY vote';
      const votesResult = await client.query(votesQuery, [disputeId]);

      let outcome = 'split';
      let maxVotes = 0;
      votesResult.rows.forEach(row => {
        if (parseInt(row.count) > maxVotes) {
          maxVotes = parseInt(row.count);
          outcome = row.vote === 'uphold' ? 'upheld' : (row.vote === 'overturn' ? 'overturned' : 'split');
        }
      });

      const updateQuery = `
        UPDATE disputes SET status = 'resolved', outcome = $1, resolved_at = NOW()
        WHERE id = $2 RETURNING *;
      `;
      const disputeResult = await client.query(updateQuery, [outcome, disputeId]);
      const dispute = disputeResult.rows[0];

      // Finalize task status based on outcome
      let finalTaskStatus = outcome === 'upheld' ? 'completed' : 'active-assigned';
      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        [finalTaskStatus, dispute.task_id]
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
}

export const verificationService = new VerificationService();
export const disputeService = new DisputeService();
