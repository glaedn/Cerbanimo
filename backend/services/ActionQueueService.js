import pool from '../db.js';
import CapabilityRegistryService from './CapabilityRegistryService.js';
import boss from '../jobs/boss.js';
import { AUTOMATION_EXECUTION_QUEUE } from '../jobs/workers/automationWorker.js';

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

async function executeKnownIntent(client, action, actorUserId) {
  const intent = action.intent_json || {};
  const functionName = intent.functionName || intent.function || intent.type;
  const args = intent.arguments || intent.input || intent;

  if (functionName === 'projects.create') {
    const result = await client.query(
      `INSERT INTO projects (
         name, description, tags, creator_id, due_date, auto_assign, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'planning'))
       RETURNING *`,
      [
        args.name,
        args.description,
        Array.isArray(args.tags) ? args.tags : [],
        actorUserId,
        args.dueDate || args.due_date || null,
        Boolean(args.autoAssign || args.auto_assign),
        args.status || null
      ]
    );

    return {
      status: 'executed',
      entityType: 'project',
      entityId: result.rows[0].id,
      project: result.rows[0]
    };
  }

  if (functionName === 'tasks.create') {
    const result = await client.query(
      `INSERT INTO tasks (
         project_id, name, description, skill_id, status, reward_tokens, dependencies, skill_level
       )
       VALUES ($1, $2, $3, $4, COALESCE($5, 'inactive-unassigned'), COALESCE($6, 10), $7::int[], COALESCE($8, 0))
       RETURNING *`,
      [
        args.projectId || args.project_id || action.related_project_id,
        args.name,
        args.description,
        args.skillId || args.skill_id || null,
        args.status || null,
        args.rewardTokens || args.reward_tokens || null,
        Array.isArray(args.dependencies) ? args.dependencies : [],
        args.skillLevel || args.skill_level || null
      ]
    );

    return {
      status: 'executed',
      entityType: 'task',
      entityId: result.rows[0].id,
      task: result.rows[0]
    };
  }

  return {
    status: 'queued',
    message: 'Action confirmed and queued for policy-controlled execution.'
  };
}

class ActionQueueService {
  async createPreview({
    actorUserId,
    actorBotIdentity,
    sourceClient,
    intent,
    previewPayload,
    riskLevel,
    relatedProjectId,
    relatedTaskId,
    relatedCommunityId
  }) {
    const normalizedRisk = normalizeRiskLevel(intent, riskLevel);
    const preview = previewPayload || buildPreviewPayload(intent);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const actionResult = await client.query(
        `INSERT INTO api_actions (
           intent_json,
           preview_payload,
           source_client,
           actor_user_id,
           actor_bot_identity,
           related_project_id,
           related_task_id,
           related_community_id,
           risk_level,
           status
         )
         VALUES ($1::jsonb, $2::jsonb, $3, $4, $5::jsonb, $6, $7, $8, $9, 'previewed')
         RETURNING *`,
        [
          JSON.stringify(intent || {}),
          JSON.stringify(preview),
          sourceClient || null,
          actorUserId || null,
          actorBotIdentity ? JSON.stringify(actorBotIdentity) : null,
          relatedProjectId || intent?.relatedProjectId || intent?.projectId || null,
          relatedTaskId || intent?.relatedTaskId || intent?.taskId || null,
          relatedCommunityId || intent?.relatedCommunityId || intent?.communityId || null,
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

  async listActions({
    actorUserId,
    limit = 50,
    status,
    projectId,
    taskId,
    communityId,
    automationRunId
  }) {
    const boundedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const params = [actorUserId, boundedLimit];
    const filters = [];
    if (status) {
      params.push(status);
      filters.push(`status = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      filters.push(`related_project_id = $${params.length}`);
    }
    if (taskId) {
      params.push(taskId);
      filters.push(`related_task_id = $${params.length}`);
    }
    if (communityId) {
      params.push(communityId);
      filters.push(`related_community_id = $${params.length}`);
    }
    if (automationRunId) {
      params.push(automationRunId);
      filters.push(`related_automation_run_id = $${params.length}`);
    }
    const filterSql = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT *
       FROM api_actions
       WHERE ($1::int IS NULL OR actor_user_id = $1)
       ${filterSql}
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
    let automationJobToSend = null;
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

      const automationIntent = action.intent_json?.automation;
      const executionResult = automationIntent?.templateKey
        ? {
            status: 'queued',
            message: 'Automation action confirmed and queued for worker execution.'
          }
        : await executeKnownIntent(client, action, actorUserId);
      const actionStatus = executionResult.status === 'executed' ? 'executed' : 'confirmed';

      const result = await client.query(
        `UPDATE api_actions
         SET status = $4,
             confirmation_event = $2::jsonb,
             execution_result = $3::jsonb,
             confirmed_at = NOW(),
             executed_at = CASE WHEN $4 = 'executed' THEN NOW() ELSE executed_at END
         WHERE id = $1
         RETURNING *`,
        [
          action.id,
          JSON.stringify({
            actorUserId,
            confirmedAt: new Date().toISOString(),
            confirmation: confirmation || {}
          }),
          JSON.stringify(executionResult),
          actionStatus
        ]
      );

      const updatedAction = result.rows[0];
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'action.confirmed', $2, $3::jsonb)`,
        [action.id, actorUserId || null, JSON.stringify({ confirmation: confirmation || {} })]
      );

      if (executionResult.status === 'executed') {
        await client.query(
          `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
           VALUES ($1, 'action.executed', $2, $3::jsonb)`,
          [action.id, actorUserId || null, JSON.stringify(executionResult)]
        );
      }

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

        await client.query(
          'UPDATE api_actions SET related_automation_run_id = $1 WHERE id = $2',
          [runResult.rows[0].id, action.id]
        );

        automationJobToSend = {
          runId: runResult.rows[0].id,
          templateKey: automationIntent.templateKey,
          actionId: action.id
        };
      }

      await client.query('COMMIT');
      if (automationJobToSend) {
        try {
          await boss.send(AUTOMATION_EXECUTION_QUEUE, automationJobToSend);
        } catch (queueError) {
          await pool.query(
            `INSERT INTO automation_logs (run_id, level, message, payload)
             VALUES ($1, 'error', 'Failed to enqueue automation worker job.', $2::jsonb)`,
            [automationJobToSend.runId, JSON.stringify({ error: queueError.message || String(queueError) })]
          );
        }
      }
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
