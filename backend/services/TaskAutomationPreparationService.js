import pool from '../db.js';
import ActionQueueService from './ActionQueueService.js';
import { serializeTaskAutomation } from './TaskAutomationClassificationService.js';
import { qualityCheckInputSchema, validatePreparationInputs } from './TaskAutomationInputValidator.js';
import {
  automationTemplateForCapability,
  resolveTaskAutomationCapability
} from './TaskAutomationCapabilityResolver.js';
import TaskAutomationAuthorizationService from './TaskAutomationAuthorizationService.js';

const ACTIVE_PREPARATION_STATUSES = ['draft', 'invalid', 'ready', 'previewed'];
const DEFAULT_QUALITY_CHECK_CAPABILITY = 'github.run_quality_checks';

class TaskAutomationPreparationService {
  async getTaskAutomationContext({ taskId, actorUserId, scopes = [] }) {
    const task = await this.getTask(taskId);
    if (!task) return null;
    const authContext = { actorUserId, scopes };
    await TaskAutomationAuthorizationService.assert(task.id, authContext, 'canViewTaskAutomation');

    const activePreparation = await this.getActivePreparation(task.id, actorUserId);
    const inputSchema = this.inputSchemaForTask(task, activePreparation?.capability_name);
    const validationResult = activePreparation?.validation_result || (
      activePreparation
        ? validatePreparationInputs(activePreparation.input_schema_snapshot || inputSchema, activePreparation.input_values || {}, { actorUserId })
        : validatePreparationInputs(inputSchema, {}, { actorUserId })
    );
    const capability = resolveTaskAutomationCapability({
      task,
      preparation: activePreparation,
      scopes,
      validationResult,
      actorUserId,
      taskAuthority: true
    });

    return {
      task,
      automation: task.automation,
      inputSchema,
      preparation: activePreparation,
      capability,
      validation: validationResult,
      policies: {
        modifyingActionsRequirePreview: true,
        destructiveActionsRequireExplicitRiskAcceptance: true,
        rawSecretsAccepted: false
      }
    };
  }

  async createPreparation({ taskId, actorUserId, scopes = [], capabilityName, inputValues = {} }) {
    if (!actorUserId) {
      const error = new Error('Authenticated actor is required to prepare task automation.');
      error.status = 403;
      throw error;
    }

    const task = await this.getTask(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }
    const authContext = { actorUserId, scopes };
    await TaskAutomationAuthorizationService.assert(task.id, authContext, 'canCreatePreparation');

    const resolvedCapabilityName = this.defaultCapabilityForTask(task, capabilityName);
    const inputSchema = this.inputSchemaForTask(task, resolvedCapabilityName);
    const validation = validatePreparationInputs(inputSchema, inputValues, { actorUserId });
    const capability = resolveTaskAutomationCapability({
      task,
      preparation: { capability_name: resolvedCapabilityName },
      scopes,
      validationResult: validation,
      actorUserId,
      taskAuthority: true
    });
    const status = this.statusFor(validation, capability);

    const existing = await this.getActivePreparation(task.id, actorUserId, resolvedCapabilityName);
    const saved = existing
      ? await this.updatePreparationRecord(existing.id, actorUserId, {
          inputSchema,
          inputValues: validation.sanitizedValues,
          validation,
          capability,
          status,
          capabilityName: resolvedCapabilityName
        })
      : await this.insertPreparationRecord({
          taskId: task.id,
          actorUserId,
          capabilityName: resolvedCapabilityName,
          inputSchema,
          inputValues: validation.sanitizedValues,
          validation,
          capability,
          status
        });

    return {
      task,
      automation: task.automation,
      inputSchema,
      preparation: saved,
      validation,
      capability
    };
  }

  async getPreparation({ taskId, preparationId, actorUserId, scopes = [] }) {
    const preparation = await this.findPreparation(preparationId, actorUserId, taskId);
    if (!preparation) return null;
    const task = await this.getTask(preparation.task_id);
    if (!task) return null;
    await TaskAutomationAuthorizationService.assert(task.id, { actorUserId, scopes }, 'canViewTaskAutomation');
    const capability = resolveTaskAutomationCapability({
      task,
      preparation,
      scopes,
      validationResult: preparation.validation_result,
      actorUserId,
      taskAuthority: true
    });
    return {
      task,
      automation: task.automation,
      inputSchema: preparation.input_schema_snapshot || this.inputSchemaForTask(task, preparation.capability_name),
      preparation,
      validation: preparation.validation_result,
      capability
    };
  }

  async updatePreparation({ taskId, preparationId, actorUserId, scopes = [], inputValues = {}, status }) {
    const current = await this.findPreparation(preparationId, actorUserId, taskId);
    if (!current) {
      const error = new Error('Task automation preparation not found');
      error.status = 404;
      throw error;
    }
    if (!ACTIVE_PREPARATION_STATUSES.includes(current.status)) {
      const error = new Error(`Preparation cannot be updated from status ${current.status}`);
      error.status = 409;
      throw error;
    }

    const task = await this.getTask(current.task_id);
    await TaskAutomationAuthorizationService.assert(task.id, { actorUserId, scopes }, 'canEditPreparation');
    const inputSchema = current.input_schema_snapshot || this.inputSchemaForTask(task, current.capability_name);
    const mergedValues = { ...(current.input_values || {}), ...(inputValues || {}) };
    const validation = validatePreparationInputs(inputSchema, mergedValues, { actorUserId });
    const capability = resolveTaskAutomationCapability({
      task,
      preparation: current,
      scopes,
      validationResult: validation,
      actorUserId,
      taskAuthority: true
    });
    const nextStatus = status === 'draft' ? 'draft' : this.statusFor(validation, capability);
    const saved = await this.updatePreparationRecord(current.id, actorUserId, {
      inputSchema,
      inputValues: validation.sanitizedValues,
      validation,
      capability,
      status: nextStatus,
      capabilityName: current.capability_name
    });

    return {
      task,
      automation: task.automation,
      inputSchema,
      preparation: saved,
      validation,
      capability
    };
  }

  async validatePreparation({ taskId, preparationId, actorUserId, scopes = [] }) {
    const current = await this.findPreparation(preparationId, actorUserId, taskId);
    if (!current) {
      const error = new Error('Task automation preparation not found');
      error.status = 404;
      throw error;
    }

    const task = await this.getTask(current.task_id);
    await TaskAutomationAuthorizationService.assert(task.id, { actorUserId, scopes }, 'canEditPreparation');
    const inputSchema = current.input_schema_snapshot || this.inputSchemaForTask(task, current.capability_name);
    const validation = validatePreparationInputs(inputSchema, current.input_values || {}, { actorUserId });
    const capability = resolveTaskAutomationCapability({
      task,
      preparation: current,
      scopes,
      validationResult: validation,
      actorUserId,
      taskAuthority: true
    });
    const status = this.statusFor(validation, capability);
    const saved = await this.updatePreparationRecord(current.id, actorUserId, {
      inputSchema,
      inputValues: validation.sanitizedValues,
      validation,
      capability,
      status,
      capabilityName: current.capability_name
    });

    return {
      task,
      automation: task.automation,
      inputSchema,
      preparation: saved,
      validation,
      capability
    };
  }

  async previewPreparation({ taskId, preparationId, actorUserId, scopes = [], sourceClient = 'api' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const preparation = await this.findPreparationForUpdate(client, preparationId, actorUserId, taskId);
      if (!preparation) {
        const error = new Error('Task automation preparation not found');
        error.status = 404;
        throw error;
      }
      if (!ACTIVE_PREPARATION_STATUSES.includes(preparation.status)) {
        const error = new Error(`Preparation cannot be previewed from status ${preparation.status}`);
        error.status = 409;
        throw error;
      }

      const task = await this.getTask(preparation.task_id, client);
      await TaskAutomationAuthorizationService.assert(task.id, { actorUserId, scopes }, 'canPreviewAutomation', client);
      const inputSchema = preparation.input_schema_snapshot || this.inputSchemaForTask(task, preparation.capability_name);
      const validation = validatePreparationInputs(inputSchema, preparation.input_values || {}, { actorUserId });
      const capability = resolveTaskAutomationCapability({
        task,
        preparation,
        scopes,
        validationResult: validation,
        actorUserId,
        taskAuthority: true
      });
      const status = this.statusFor(validation, capability);

      const updatedPrep = await this.updatePreparationRecord(preparation.id, actorUserId, {
        inputSchema,
        inputValues: validation.sanitizedValues,
        validation,
        capability,
        status,
        capabilityName: preparation.capability_name,
        client
      });

      if (!validation.valid) {
        const error = new Error('Preparation inputs are incomplete.');
        error.status = 422;
        error.details = { validation };
        throw error;
      }
      if (!capability.executionAvailable) {
        const error = new Error('Task automation capability is not executable.');
        error.status = 409;
        error.details = { capability };
        throw error;
      }

      const existingAction = updatedPrep.preview_action_id
        ? await this.hydrateActionForUpdate(client, updatedPrep.preview_action_id, actorUserId)
        : null;
      if (existingAction && ['previewed', 'confirmed', 'executed'].includes(existingAction.status)) {
        await client.query('COMMIT');
        return {
          task,
          automation: task.automation,
          inputSchema,
          preparation: updatedPrep,
          validation,
          capability,
          action: existingAction,
          template: automationTemplateForCapability(updatedPrep.capability_name)
        };
      }

      const template = automationTemplateForCapability(updatedPrep.capability_name);
      const action = await ActionQueueService.createPreviewWithClient(client, {
        actorUserId,
        sourceClient,
        relatedTaskId: task.id,
        preparationId: updatedPrep.id,
        intent: {
          functionName: 'tasks.run_automation',
          type: 'tasks.run_automation',
          summary: `Run ${updatedPrep.capability_name} for task "${task.name}".`,
          arguments: {
            taskId: task.id,
            preparationId: updatedPrep.id,
            capabilityName: updatedPrep.capability_name
          },
          automation: {
            templateKey: capability.templateKey,
            input: {
              taskId: task.id,
              preparationId: updatedPrep.id,
              capabilityName: updatedPrep.capability_name
            }
          }
        },
        previewPayload: {
          title: `Run quality checks for ${task.name}`,
          summary: 'Cerbanimo will run configured repository quality checks and attach the resulting report. Passing checks submit the task for review.',
          functionName: 'tasks.run_automation',
          template,
          input: {
            taskId: task.id,
            preparationId: updatedPrep.id,
            capabilityName: updatedPrep.capability_name
          },
          confirmationRequired: true,
          effects: [
            'Create an auditable automation run',
            'Run deterministic quality checks in the configured executor',
            'Attach a quality-check report to the task',
            'Move the task to submitted only if checks pass'
          ],
          irreversible: false
        },
        riskLevel: template?.riskLevel || 'normal'
      });

      const saved = await this.linkPreviewAction(updatedPrep.id, actorUserId, action.id, client);
      await client.query(
        `INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload)
         VALUES ($1, 'automation.preview.linked', $2, $3::jsonb)`,
        [action.id, actorUserId, JSON.stringify({ preparationId: saved.id, taskId: task.id })]
      );
      await client.query('COMMIT');
      return {
        task,
        automation: task.automation,
        inputSchema,
        preparation: saved,
        validation,
        capability,
        action,
        template
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelPreparation({ taskId, preparationId, actorUserId, reason }) {
    const current = await this.findPreparation(preparationId, actorUserId, taskId);
    if (!current) {
      const error = new Error('Task automation preparation not found');
      error.status = 404;
      throw error;
    }
    await TaskAutomationAuthorizationService.assert(current.task_id, { actorUserId }, 'canEditPreparation');
    if (!ACTIVE_PREPARATION_STATUSES.includes(current.status)) {
      const error = new Error(`Preparation cannot be cancelled from status ${current.status}`);
      error.status = 409;
      throw error;
    }

    const result = await pool.query(
      `UPDATE task_automation_preparations
       SET status = 'cancelled',
           cancelled_at = NOW(),
           validation_result = COALESCE(validation_result, '{}'::jsonb) || $4::jsonb,
           updated_at = NOW()
       WHERE (id::text = $1 OR preparation_uuid::text = $1)
         AND task_id::text = $2
         AND actor_user_id = $3
       RETURNING *`,
      [
        String(preparationId),
        String(taskId),
        actorUserId,
        JSON.stringify({ cancelledReason: reason || null })
      ]
    );

    return result.rows[0] || null;
  }

  async getTask(taskId, client = pool) {
    const result = await client.query(
      `SELECT t.*, s.name AS skill_name, p.creator_id AS project_creator_id
       FROM tasks t
       LEFT JOIN skills s ON t.skill_id = s.id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id::text = $1
       LIMIT 1`,
      [String(taskId)]
    );
    const task = result.rows[0];
    return task ? { ...task, automation: serializeTaskAutomation(task) } : null;
  }

  async getActivePreparation(taskId, actorUserId, capabilityName = null) {
    if (!actorUserId) return null;
    const params = [taskId, actorUserId, ACTIVE_PREPARATION_STATUSES];
    let capabilitySql = '';
    if (capabilityName) {
      params.push(capabilityName);
      capabilitySql = `AND capability_name = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT *
       FROM task_automation_preparations
       WHERE task_id = $1
         AND actor_user_id = $2
         AND status = ANY($3::text[])
         ${capabilitySql}
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async findPreparation(preparationId, actorUserId, taskId = null) {
    const params = [String(preparationId), actorUserId];
    const filters = [
      '(id::text = $1 OR preparation_uuid::text = $1)',
      'actor_user_id = $2'
    ];
    if (taskId) {
      params.push(String(taskId));
      filters.push(`task_id::text = $${params.length}`);
    }
    const result = await pool.query(
      `SELECT *
       FROM task_automation_preparations
       WHERE ${filters.join(' AND ')}
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async findPreparationForUpdate(client, preparationId, actorUserId, taskId = null) {
    const params = [String(preparationId), actorUserId];
    const filters = [
      '(id::text = $1 OR preparation_uuid::text = $1)',
      'actor_user_id = $2'
    ];
    if (taskId) {
      params.push(String(taskId));
      filters.push(`task_id::text = $${params.length}`);
    }
    const result = await client.query(
      `SELECT *
       FROM task_automation_preparations
       WHERE ${filters.join(' AND ')}
       FOR UPDATE`,
      params
    );
    return result.rows[0] || null;
  }

  async hydrateActionForUpdate(client, actionId, actorUserId) {
    const result = await client.query(
      `SELECT *
       FROM api_actions
       WHERE (id::text = $1 OR action_uuid::text = $1)
         AND actor_user_id = $2
       FOR UPDATE`,
      [String(actionId), actorUserId]
    );
    return result.rows[0] || null;
  }

  inputSchemaForTask(task, capabilityName = null) {
    if (capabilityName === DEFAULT_QUALITY_CHECK_CAPABILITY) return qualityCheckInputSchema();
    if (task.automation?.requirements?.capabilities?.includes(DEFAULT_QUALITY_CHECK_CAPABILITY)) {
      return qualityCheckInputSchema();
    }
    return Array.isArray(task.automation?.requiredHumanInputs) ? task.automation.requiredHumanInputs : [];
  }

  defaultCapabilityForTask(task, requestedCapability) {
    if (requestedCapability) return requestedCapability;
    const capabilities = Array.isArray(task.automation?.requirements?.capabilities)
      ? task.automation.requirements.capabilities
      : [];
    if (capabilities.includes(DEFAULT_QUALITY_CHECK_CAPABILITY)) return DEFAULT_QUALITY_CHECK_CAPABILITY;
    return capabilities[0] || null;
  }

  statusFor(validation, capability) {
    if (!validation?.valid) return 'invalid';
    return capability?.executionAvailable ? 'ready' : 'draft';
  }

  async insertPreparationRecord({
    taskId,
    actorUserId,
    capabilityName,
    inputSchema,
    inputValues,
    validation,
    capability,
    status,
    client = pool
  }) {
    const result = await client.query(
      `INSERT INTO task_automation_preparations (
         task_id, actor_user_id, capability_name, status, input_schema_snapshot,
         input_values, validation_result, capability_snapshot, permission_snapshot, ready_at
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
               CASE WHEN $4 = 'ready' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        taskId,
        actorUserId,
        capabilityName,
        status,
        JSON.stringify(inputSchema || []),
        JSON.stringify(inputValues || {}),
        JSON.stringify(validation || null),
        JSON.stringify(capability || null),
        JSON.stringify({
          actorUserId,
          actorAuthorized: Boolean(capability?.actorAuthorized),
          capturedAt: new Date().toISOString()
        })
      ]
    );
    return result.rows[0];
  }

  async updatePreparationRecord(id, actorUserId, {
    inputSchema,
    inputValues,
    validation,
    capability,
    status,
    capabilityName,
    client = pool
  }) {
    const result = await client.query(
      `UPDATE task_automation_preparations
       SET capability_name = COALESCE($7, capability_name),
           status = $2,
           input_schema_snapshot = $3::jsonb,
           input_values = $4::jsonb,
           validation_result = $5::jsonb,
           capability_snapshot = $6::jsonb,
           permission_snapshot = $8::jsonb,
           ready_at = CASE WHEN $2 = 'ready' THEN COALESCE(ready_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1
         AND actor_user_id = $9
       RETURNING *`,
      [
        id,
        status,
        JSON.stringify(inputSchema || []),
        JSON.stringify(inputValues || {}),
        JSON.stringify(validation || null),
        JSON.stringify(capability || null),
        capabilityName || null,
        JSON.stringify({
          actorUserId,
          actorAuthorized: Boolean(capability?.actorAuthorized),
          capturedAt: new Date().toISOString()
        }),
        actorUserId
      ]
    );
    return result.rows[0];
  }

  async linkPreviewAction(preparationId, actorUserId, actionId, client = pool) {
    const result = await client.query(
      `UPDATE task_automation_preparations
       SET preview_action_id = $3,
           status = 'previewed',
           updated_at = NOW()
       WHERE id = $1
         AND actor_user_id = $2
       RETURNING *`,
      [preparationId, actorUserId, actionId]
    );
    return result.rows[0];
  }
}

export { ACTIVE_PREPARATION_STATUSES, DEFAULT_QUALITY_CHECK_CAPABILITY };
export default new TaskAutomationPreparationService();
