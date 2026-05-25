import pool from '../db.js';
import CivicEventService from './CivicEventService.js';

class VestingService {
  async processVestingReleases() {
    console.log('Processing token vesting releases...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const vestingsRes = await client.query(`
        SELECT * FROM token_vesting
        WHERE vesting_unlocks_at <= NOW()
          AND vesting_revoked = FALSE
          AND released = FALSE
        FOR UPDATE
      `);

      for (const vesting of vestingsRes.rows) {
        const disputeRes = await client.query(
          "SELECT id FROM disputes WHERE task_id = $1 AND status != 'resolved' OR (status = 'resolved' AND outcome = 'overturn')",
          [vesting.task_id]
        );

        if (disputeRes.rows.length > 0) {
          console.log(`Vesting ${vesting.id} revoked due to dispute on task ${vesting.task_id}`);
          await client.query(
            'UPDATE token_vesting SET vesting_revoked = TRUE WHERE id = $1',
            [vesting.id]
          );
          continue;
        }

        await client.query(
          'UPDATE users SET cotokens = cotokens + $1 WHERE id = $2',
          [vesting.vested_tokens, vesting.user_id]
        );

        await client.query(
          'UPDATE token_vesting SET released = TRUE, released_at = NOW() WHERE id = $1',
          [vesting.id]
        );

        const ledgerEntry = {
          type: 'vesting_release',
          tokens: Number(vesting.vested_tokens),
          projectId: vesting.project_id,
          taskId: vesting.task_id,
          creationDate: new Date().toISOString()
        };
        await client.query(
          'UPDATE users SET token_ledger = array_append(COALESCE(token_ledger, \'{}\'), $1::jsonb) WHERE id = $2',
          [JSON.stringify(ledgerEntry), vesting.user_id]
        );

        await CivicEventService.recordEvent({
          eventType: 'token.vesting_released',
          actorId: vesting.user_id,
          entityType: 'project',
          entityId: vesting.project_id,
          payload: { amount: vesting.vested_tokens, taskId: vesting.task_id },
          correlationId: `vesting:${vesting.id}`
        }, client);
      }

      await client.query('COMMIT');
      console.log(`Vesting release processing complete. Released ${vestingsRes.rows.length} entries.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error processing vesting releases:', err);
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new VestingService();
