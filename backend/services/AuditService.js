import pool from '../db.js';
import { verificationService } from './VerificationService.js';

class AuditService {
  async processPendingAudits() {
    console.log('Processing pending audits...');
    const pendingAudits = await pool.query(
      "SELECT * FROM audit_queue WHERE status = 'pending' ORDER BY triggered_at LIMIT 10"
    );

    for (const audit of pendingAudits.rows) {
      try {
        await this.dispatchAudit(audit);
      } catch (err) {
        console.error(`Failed to dispatch audit ${audit.id}:`, err);
      }
    }
  }

  async dispatchAudit(audit) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const verifRes = await client.query(
        'SELECT * FROM verification_events WHERE id = $1',
        [audit.verification_id]
      );
      const verification = verifRes.rows[0];

      if (!verification || !verification.task_id) {
        await client.query("UPDATE audit_queue SET status = 'skipped' WHERE id = $1", [audit.id]);
        await client.query('COMMIT');
        return;
      }

      const originalVerifiers = (await client.query(
        'SELECT verifier_id FROM verification_events WHERE task_id = $1',
        [verification.task_id]
      )).rows.map(r => r.verifier_id).filter(Boolean);

      const auditValidators = await verificationService.selectValidators({
        taskId: verification.task_id,
        excludeUserIds: originalVerifiers,
        limit: 3,
        minTrustLevel: 2,
        client
      });

      if (auditValidators.length === 0) {
        console.warn(`No suitable validators found for audit ${audit.id}`);
        await client.query('ROLLBACK');
        return;
      }

      await client.query(
        "UPDATE audit_queue SET status = 'in_progress', updated_at = NOW() WHERE id = $1",
        [audit.id]
      );

      await client.query(
        'UPDATE tasks SET reviewer_ids = array_cat(COALESCE(reviewer_ids, \'{}\'), $1::int[]) WHERE id = $2',
        [auditValidators.map(v => v.validatorId), verification.task_id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async resolveAudit(auditId, confirmed) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const auditRes = await client.query(
        'SELECT * FROM audit_queue WHERE id = $1 FOR UPDATE',
        [auditId]
      );
      const audit = auditRes.rows[0];

      if (confirmed) {
        const verifRes = await client.query(
          'SELECT verifier_id FROM verification_events WHERE id = $1',
          [audit.verification_id]
        );
        const originalVerifierId = verifRes.rows[0]?.verifier_id;

        if (originalVerifierId) {
          await client.query(
            'UPDATE users SET trust_level = trust_level + 0.2 WHERE id = $1',
            [originalVerifierId]
          );
        }

        await client.query(
          "UPDATE audit_queue SET status = 'completed', outcome = 'confirmed', updated_at = NOW() WHERE id = $1",
          [auditId]
        );
      } else {
        const verifRes = await client.query(
          'SELECT * FROM verification_events WHERE id = $1',
          [audit.verification_id]
        );
        const verification = verifRes.rows[0];

        if (verification && verification.task_id) {
          await verificationService.applyDisputeResolution({
            taskId: verification.task_id,
            overturned: true,
            client
          });
        }

        await client.query(
          "UPDATE audit_queue SET status = 'completed', outcome = 'overturned', updated_at = NOW() WHERE id = $1",
          [auditId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new AuditService();
