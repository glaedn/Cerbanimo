import pool from '../db.js';
import CapabilityRegistryService from './CapabilityRegistryService.js';

const destructiveNames = new Set([
  'projects.delete',
  'tasks.delete',
  'communities.delete',
  'automation.staging_deploy_hooks'
]);

function normalizeRiskLevel(intent = {}, requestedRisk = null) {
  if (requestedRisk) return requestedRisk;
  const functionName = intent.functionName || intent.function || intent.type;
  if (destructiveNames.has(functionName)) return 'destructive';
  if (String(functionName || '').includes('delete')) return 'destructive';
  if (String(functionName || '').includes('github_issue')) return 'high';
  return 'normal';
}

function buildPreviewPayload(intent = {}) {
  const functionName = intent.functionName || intent.function || intent.type || 'unknown';
  const knownFunction = CapabilityRegistryService.findFunctionByName(functionName);

  return {
    title: intent.title || `Preview ${functionName}`,
    summary: intent.summary || intent.description || `Cerbanimo will prepare ${functionName} for execution after confirmation.`,
    functionName,
    functionSchema: knownFunction || null,
    arguments: intent.arguments || intent.input || {},
    confirmationRequired: true,
    effects: intent.effects || [],
    missingInputs: intent.missingInputs || [],
    irreversible: normalizeRiskLevel(intent) === 'destructive'
  };
}

class ActionQueueService {
  async createPreview({ actorUserId, sourceClient, intent, previewPayload, riskLevel }) {
    const normalizedRisk = normalizeRiskLevel(intent, riskLevel);
    const preview = previewPayload || buildPreviewPayload(intent);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const actionResult = await client.query(
        `INSERT INTO api_actions (
           intent_json, preview_payload, source_client, actor_user_id, risk_level, status
         )
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5, 'previewed')
         RETURNING *`,
        [
          JSON.stringify(intent || {}),
          JSON.stringify(preview),
          sourceClient || null,
          actorUserId || null,
          normalizedRisk
        ]
      );

      const action = actionResult.rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'preview.created', $2, $3::jsonb)`,
        [action.id, actorUserId || null, JSON.stringify({ sourceClient, riskLevel: normalizedRisk })]
      );

      await client.query('COMMIT');
      return action;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listActions({ actorUserId, limit = 50, status }) {
    const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const params = [actorUserId, boundedLimit];
    const statusFilter = status ? 'AND status = $3' : '';
    if (status) params.push(status);

    const result = await pool.query(
      `SELECT *
       FROM api_actions
       WHERE ($1::int IS NULL OR actor_user_id = $1)
       ${statusFilter}
       ORDER BY created_at DESC
       LIMIT $2`,
      params
    );

    return result.rows;
  }

  async getActionForUpdate(client, id) {
    const result = await client.query(
      `SELECT *
       FROM api_actions
       WHERE id::text = $1 OR action_uuid::text = $1
       FOR UPDATE`,
      [String(id)]
    );
    return result.rows[0];
  }

  async confirmAction({ actionId, actorUserId, confirmation }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const action = await this.getActionForUpdate(client, actionId);
      if (!action) {
        const error = new Error('Action not found');
        error.status = 404;
        throw error;
      }
      if (action.status !== 'previewed') {
        const error = new Error(`Action cannot be confirmed from status ${action.status}`);
        error.status = 409;
        throw error;
      }
      if (action.risk_level === 'destructive' && confirmation?.explicitRiskAccepted !== true) {
        const error = new Error('Destructive actions require explicitRiskAccepted=true');
        error.status = 400;
        throw error;
      }

      const executionResult = {
        status: 'queued',
        message: 'Action confirmed and queued for policy-controlled execution.'
      };

      const result = await client.query(
        `UPDATE api_actions
         SET status = 'confirmed',
             confirmation_event = $2::jsonb,
             execution_result = $3::jsonb,
             confirmed_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          action.id,
          JSON.stringify({
            actorUserId,
            confirmedAt: new Date().toISOString(),
            confirmation: confirmation || {}
          }),
          JSON.stringify(executionResult)
        ]
      );

      const updatedAction = result.rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'action.confirmed', $2, $3::jsonb)`,
        [action.id, actorUserId || null, JSON.stringify({ confirmation: confirmation || {} })]
      );

      const automationIntent = updatedAction.intent_json?.automation;
      if (automationIntent?.templateKey) {
        const template = CapabilityRegistryService.findAutomationTemplate(automationIntent.templateKey);
        const runResult = await client.query(
          `INSERT INTO automation_runs (
             action_id, template_key, status, input, worker_name, source_client, actor_user_id
           )
           VALUES ($1, $2, 'queued', $3::jsonb, $4, $5, $6)
           RETURNING *`,
          [
            action.id,
            automationIntent.templateKey,
            JSON.stringify(automationIntent.input || {}),
            template?.workerName || null,
            updatedAction.source_client,
            actorUserId || null
          ]
        );

        await client.query(
          `INSERT INTO automation_logs (run_id, level, message, payload)
           VALUES ($1, 'info', 'Automation run queued after action confirmation.', $2::jsonb)`,
          [runResult.rows[0].id, JSON.stringify({ actionId: action.id })]
        );
      }

      await client.query('COMMIT');
      return updatedAction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelAction({ actionId, actorUserId, reason }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const action = await this.getActionForUpdate(client, actionId);
      if (!action) {
        const error = new Error('Action not found');
        error.status = 404;
        throw error;
      }
      if (!['previewed', 'confirmed'].includes(action.status)) {
        const error = new Error(`Action cannot be cancelled from status ${action.status}`);
        error.status = 409;
        throw error;
      }

      const result = await client.query(
        `UPDATE api_actions
         SET status = 'cancelled',
             cancelled_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [action.id]
      );

      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'action.cancelled', $2, $3::jsonb)`,
        [action.id, actorUserId || null, JSON.stringify({ reason: reason || null })]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAutomationRun(runId) {
    const runResult = await pool.query(
      `SELECT *
       FROM automation_runs
       WHERE id::text = $1 OR run_uuid::text = $1`,
      [String(runId)]
    );
    const run = runResult.rows[0];
    if (!run) return null;

    const logsResult = await pool.query(
      'SELECT level, message, payload, created_at FROM automation_logs WHERE run_id = $1 ORDER BY created_at ASC',
      [run.id]
    );

    return {
      ...run,
      logs: logsResult.rows
    };
  }
}

export default new ActionQueueService();
