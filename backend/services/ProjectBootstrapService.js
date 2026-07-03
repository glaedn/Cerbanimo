import pool from '../db.js';
import GuildService from './GuildService.js';
import ImpactGraphService from './ImpactGraphService.js';
import TaskRoutingService from './TaskRoutingService.js';
import { autoGenerateTasks, autogeneratePlan } from './taskGenerator.js';
import { validateGeneratedGraph } from './ProjectTaskGraphValidator.js';

export const BOOTSTRAP_STEPS = [
  'validateInput',
  'generateProjectPlan',
  'generateTaskGraph',
  'validateTaskGraph',
  'persistProjectGraph',
  'activateRootTasks',
  'finalizeAction'
];

export const BOOTSTRAP_ERROR_CODES = {
  INPUT_INVALID: 'BOOTSTRAP_INPUT_INVALID',
  PROVIDER_UNAVAILABLE: 'BOOTSTRAP_PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'BOOTSTRAP_PROVIDER_TIMEOUT',
  OUTPUT_INVALID: 'BOOTSTRAP_OUTPUT_INVALID',
  GRAPH_INVALID: 'BOOTSTRAP_GRAPH_INVALID',
  PERSIST_FAILED: 'BOOTSTRAP_PERSIST_FAILED',
  ACTIVATION_FAILED: 'BOOTSTRAP_ACTIVATION_FAILED',
  QUEUE_FAILED: 'BOOTSTRAP_QUEUE_FAILED',
  PERMISSION_DENIED: 'BOOTSTRAP_PERMISSION_DENIED'
};

class ProjectBootstrapError extends Error {
  constructor(code, message, stage, details = {}, retryable = false) {
    super(message);
    this.code = code;
    this.stage = stage;
    this.details = details;
    this.retryable = retryable;
  }
}

class ProjectBootstrapService {
  constructor(deps = {}) {
    this.pool = deps.pool || pool;
    this.guildService = deps.guildService || GuildService;
    this.impactGraphService = deps.impactGraphService || ImpactGraphService;
    this.taskRoutingService = deps.taskRoutingService || TaskRoutingService;
    this.generators = deps.generators || { autoGenerateTasks, autogeneratePlan };
  }

  async bootstrapFromWorkflow(workflowRunId) {
    const workflow = await this.getWorkflow(workflowRunId);
    if (!workflow) throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.INPUT_INVALID, 'Workflow run not found.', 'validateInput');
    if (['completed', 'failed', 'blocked'].includes(workflow.status)) return workflow.state?.result || workflow;

    await this.incrementAttempt(workflow.id);
    await this.updateWorkflow(workflow.id, 'running', { startedAt: workflow.started_at || new Date().toISOString() });
    await this.recordActionEvent(workflow.action_id, 'workflow.started', workflow.actor_user_id, { workflowRunId: workflow.id });

    try {
      const projectInput = await this.runStep(workflow.id, 'validateInput', () => this.validateInput(workflow.state?.input || {}, workflow.actor_user_id));

      let generatedData = workflow.state?.generatedData;
      if (!workflow.related_project_id) {
        if (projectInput.generationMode === 'plan_then_tasks') {
          generatedData = await this.runStep(workflow.id, 'generateProjectPlan', () => this.generateProjectPlan(projectInput));
          await this.completeStep(workflow.id, 'generateTaskGraph', {
            source: 'generateProjectPlan',
            taskCount: Array.isArray(generatedData?.tasks) ? generatedData.tasks.length : 0
          });
        } else {
          await this.skipStep(workflow.id, 'generateProjectPlan', { reason: 'tasks_only generation mode' });
        }
        if (projectInput.generationMode !== 'plan_then_tasks') {
          generatedData = await this.runStep(workflow.id, 'generateTaskGraph', () => this.generateTaskGraph(projectInput));
        }

        const validation = await this.runStep(workflow.id, 'validateTaskGraph', () => this.validateGeneratedGraph(generatedData, projectInput));
        const persisted = await this.runStep(workflow.id, 'persistProjectGraph', () => this.persistGeneratedGraph(null, workflow.actor_user_id, projectInput, { ...generatedData, tasks: validation.tasks }));
        await this.updateWorkflow(workflow.id, 'running', {
          relatedProjectId: persisted.project.id,
          result: { project: persisted.project, tasksCreated: persisted.tasks.length }
        });
        await this.setWorkflowProject(workflow.id, persisted.project.id, workflow.action_id);
        await this.recordActionEvent(workflow.action_id, 'project.created', workflow.actor_user_id, { projectId: persisted.project.id });
      }

      const latest = await this.getWorkflow(workflow.id);
      const activation = await this.runStep(workflow.id, 'activateRootTasks', () => this.activateAndVerify(latest.related_project_id));
      const result = await this.runStep(workflow.id, 'finalizeAction', () => this.finalizeAction(latest.action_id, latest.related_project_id, activation));
      await this.updateWorkflow(workflow.id, 'completed', { result, completedAt: new Date().toISOString() });
      await this.recordActionEvent(latest.action_id, 'action.executed', latest.actor_user_id, result);
      return result;
    } catch (error) {
      return this.failWorkflow(workflow, error);
    }
  }

  async generateForExistingProject(projectId, options = {}) {
    const projectResult = await this.pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const project = projectResult.rows[0];
    if (!project) throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.INPUT_INVALID, 'Project not found.', 'validateInput');

    const existing = await this.loadProjectTasks(projectId);
    if (existing.tasks.length > 0) {
      const active = await this.activateAndVerify(projectId);
      return { project, tasks: active.tasks, activeTasks: active.activeTasks, reusedExistingTasks: true };
    }

    const outcomeResult = await this.pool.query('SELECT statement FROM outcomes WHERE project_id = $1 ORDER BY id ASC LIMIT 1', [projectId]);
    const input = this.normalizeProjectInput({
      name: project.name,
      description: project.description,
      outcomeStatement: outcomeResult.rows[0]?.statement || project.description,
      tags: project.tags || [],
      dueDate: project.due_date,
      autoAssign: project.auto_assign,
      location: project.location,
      isService: project.is_service,
      serviceVisibility: project.service_visibility || ['private'],
      servicePrice: project.service_price || 0,
      generationMode: options.usePlan === false ? 'tasks_only' : 'plan_then_tasks'
    });

    const generated = input.generationMode === 'plan_then_tasks'
      ? await this.generateProjectPlan(input)
      : await this.generateTaskGraph(input);
    const validation = this.validateGeneratedGraph(generated, input);
    await this.persistTasksForExistingProject(projectId, input, { ...generated, tasks: validation.tasks });
    const activation = await this.activateAndVerify(projectId);
    return { project, tasks: activation.tasks, activeTasks: activation.activeTasks, reusedExistingTasks: false };
  }

  validateGeneratedGraph(generatedData, projectInput) {
    const result = validateGeneratedGraph(generatedData, projectInput);
    if (!result.valid) {
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.GRAPH_INVALID, 'Generated task graph is invalid.', 'validateTaskGraph', { findings: result.findings });
    }
    return result;
  }

  async persistGeneratedGraph(client, actorUserId, projectInput, generatedData) {
    return this.withTransaction(client, async (trx) => {
      const project = await this.insertProject(trx, actorUserId, projectInput, generatedData.projectPlan);
      await this.impactGraphService.createOutcome(project.id, projectInput.outcomeStatement, trx);
      const tasks = await this.insertTasks(trx, actorUserId, project.id, generatedData.tasks);
      await this.impactGraphService.createTaskImpactNodesForProject(project.id, tasks, trx);
      return { project, tasks };
    }, 'persistProjectGraph');
  }

  async activateAndVerify(projectId, { allowNoRoot = false } = {}) {
    await this.taskRoutingService.activateProjectTasks(projectId);
    const { tasks, activeTasks } = await this.loadProjectTasks(projectId);
    const rootTasks = tasks.filter((task) => !Array.isArray(task.dependencies) || task.dependencies.length === 0);
    if (!allowNoRoot && rootTasks.length === 0) {
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.GRAPH_INVALID, 'Task graph has no root task to activate.', 'activateRootTasks', { projectId }, true);
    }
    if (!allowNoRoot && rootTasks.length > 0 && !rootTasks.some((task) => isActiveStatus(task.status))) {
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.ACTIVATION_FAILED, 'No root task became active after activation.', 'activateRootTasks', { projectId, rootTaskCount: rootTasks.length }, true);
    }
    return { tasks, activeTasks };
  }

  validateInput(input, actorUserId) {
    if (!actorUserId) {
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.PERMISSION_DENIED, 'Authenticated actor is required.', 'validateInput');
    }
    return this.normalizeProjectInput(input);
  }

  normalizeProjectInput(input = {}) {
    const args = input.arguments || input.input || input;
    const normalized = {
      name: limitText(args.name, 100),
      description: normalizeText(args.description, 5000),
      outcomeStatement: normalizeText(args.outcomeStatement, 5000),
      tags: Array.isArray(args.tags) ? args.tags.map((tag) => limitText(tag?.name || tag, 80)).filter(Boolean) : [],
      dueDate: normalizeDate(args.dueDate ?? args.due_date),
      autoAssign: Boolean(args.autoAssign ?? args.auto_assign),
      location: normalizeLocation(args.location),
      isService: Boolean(args.isService ?? args.is_service),
      serviceVisibility: Array.isArray(args.serviceVisibility ?? args.service_visibility) ? (args.serviceVisibility ?? args.service_visibility) : ['private'],
      servicePrice: Math.max(0, Number.parseInt(args.servicePrice ?? args.service_price ?? 0, 10) || 0),
      generationMode: args.generationMode === 'tasks_only' ? 'tasks_only' : 'plan_then_tasks'
    };
    const missing = [];
    if (!normalized.name) missing.push('name');
    if (!normalized.description) missing.push('description');
    if (!normalized.outcomeStatement) missing.push('outcomeStatement');
    if (missing.length) {
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.INPUT_INVALID, `Missing required fields: ${missing.join(', ')}`, 'validateInput', { missing });
    }
    return normalized;
  }

  async generateProjectPlan(input) {
    return this.generators.autogeneratePlan(input.name, input.description, input.tags, null, input.dueDate, input.outcomeStatement);
  }

  async generateTaskGraph(input) {
    return this.generators.autoGenerateTasks(input.name, input.description, input.tags, null, input.dueDate, input.outcomeStatement);
  }

  async persistTasksForExistingProject(projectId, projectInput, generatedData) {
    return this.withTransaction(null, async (trx) => {
      await trx.query('UPDATE projects SET project_plan = COALESCE($1, project_plan) WHERE id = $2', [generatedData.projectPlan || null, projectId]);
      const tasks = await this.insertTasks(trx, projectInput.actorUserId, projectId, generatedData.tasks);
      await this.impactGraphService.createTaskImpactNodesForProject(projectId, tasks, trx);
      return tasks;
    }, 'persistProjectGraph');
  }

  async insertProject(client, actorUserId, input, projectPlan) {
    const result = await client.query(
      `INSERT INTO projects (
         name, description, tags, creator_id, due_date, location, auto_assign,
         project_plan, public_good_score, public_good_source, is_service, service_visibility, service_price
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.6, 'default', $9, $10, $11)
       RETURNING *`,
      [input.name, input.description, input.tags, actorUserId, input.dueDate, input.location, input.autoAssign, projectPlan || null, input.isService, input.serviceVisibility, input.servicePrice]
    );
    return result.rows[0];
  }

  async insertTasks(client, actorUserId, projectId, tasks) {
    const idMap = new Map();
    const inserted = [];
    for (const task of tasks) {
      const skillId = await this.getOrCreateSkill(client, task.skill_name);
      const result = await client.query(
        `INSERT INTO tasks (
           project_id, name, description, skill_id, skill_level, status, dependencies,
           reward_tokens, resource_requirements, start_date, due_date, is_local
         )
         VALUES ($1, $2, $3, $4, $5, 'inactive-unassigned', $6::int[], $7, $8, $9, $10, $11)
         RETURNING *`,
        [projectId, task.name, task.description, skillId, task.skill_level || 0, [], task.reward_tokens, task.resource_requirements || [], task.start_date, task.due_date, task.is_local || false]
      );
      const dbTask = result.rows[0];
      idMap.set(String(task.generated_id ?? task.id), dbTask.id);
      inserted.push({ ...task, ...dbTask, db_id: dbTask.id, db_id_internal: dbTask.id });
    }
    for (const task of inserted) {
      const deps = (task.dependencies || []).map((depId) => idMap.get(String(depId))).filter(Boolean);
      await client.query('UPDATE tasks SET dependencies = $1::int[] WHERE id = $2', [deps, task.db_id]);
      task.resolvedDependencies = deps;
    }
    return inserted;
  }

  async getOrCreateSkill(client, skillName) {
    const name = limitText(skillName || 'Project Management', 100);
    const existing = await client.query('SELECT id FROM skills WHERE LOWER(name) = LOWER($1) ORDER BY id ASC LIMIT 1', [name]);
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await client.query('INSERT INTO skills (name) VALUES ($1) RETURNING id', [name]);
    return created.rows[0].id;
  }

  async finalizeAction(actionId, projectId, activation) {
    const result = {
      status: 'executed',
      entityType: 'project',
      entityId: projectId,
      projectId,
      taskCount: activation.tasks.length,
      activeTaskCount: activation.activeTasks.length,
      activeTasks: activation.activeTasks
    };
    if (actionId) {
      await this.pool.query(
        `UPDATE api_actions
         SET status = 'executed', execution_result = $1::jsonb, executed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(result), actionId]
      );
    }
    return result;
  }

  async getWorkflow(id) {
    const result = await this.pool.query('SELECT * FROM workflow_runs WHERE id::text = $1', [String(id)]);
    return result.rows[0];
  }

  async hydrateActionDetail(actionId, actorUserId) {
    const actionResult = await this.pool.query(
      `SELECT * FROM api_actions WHERE (id::text = $1 OR action_uuid::text = $1) AND ($2::int IS NULL OR actor_user_id = $2)`,
      [String(actionId), actorUserId || null]
    );
    const action = actionResult.rows[0];
    if (!action) return null;
    const workflowResult = await this.pool.query('SELECT * FROM workflow_runs WHERE action_id = $1 ORDER BY created_at DESC LIMIT 1', [action.id]);
    const workflow = workflowResult.rows[0] || null;
    const stepsResult = workflow ? await this.pool.query('SELECT * FROM workflow_steps WHERE workflow_run_id = $1 ORDER BY created_at ASC', [workflow.id]) : { rows: [] };
    const projectId = workflow?.related_project_id || action.related_project_id || action.execution_result?.projectId || null;
    const project = projectId ? (await this.pool.query('SELECT * FROM projects WHERE id = $1', [projectId])).rows[0] || null : null;
    const { tasks, activeTasks } = projectId ? await this.loadProjectTasks(projectId) : { tasks: [], activeTasks: [] };
    const terminal = ['executed', 'failed', 'cancelled'].includes(action.status) || ['completed', 'failed', 'blocked'].includes(workflow?.status);
    return {
      action,
      workflow,
      steps: stepsResult.rows,
      project,
      tasks,
      activeTasks,
      terminal,
      result: action.execution_result || workflow?.state?.result || null,
      error: workflow?.last_error || (action.status === 'failed' ? action.execution_result : null)
    };
  }

  async loadProjectTasks(projectId) {
    const result = await this.pool.query(
      `SELECT t.*, s.name AS skill_name
       FROM tasks t
       LEFT JOIN skills s ON t.skill_id = s.id
       WHERE t.project_id = $1
       ORDER BY t.id ASC`,
      [projectId]
    );
    const tasks = result.rows;
    return { tasks, activeTasks: tasks.filter((task) => isActiveStatus(task.status)) };
  }

  async runStep(workflowRunId, stepName, fn) {
    const existing = await this.pool.query('SELECT * FROM workflow_steps WHERE workflow_run_id = $1 AND step_name = $2 ORDER BY created_at DESC LIMIT 1', [workflowRunId, stepName]);
    if (existing.rows[0]?.status === 'completed' && existing.rows[0].result) return existing.rows[0].result;
    const stepId = existing.rows[0]?.id || (await this.pool.query(
      'INSERT INTO workflow_steps (workflow_run_id, step_name, status, started_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [workflowRunId, stepName, 'running']
    )).rows[0].id;
    try {
      const result = await fn();
      await this.pool.query('UPDATE workflow_steps SET status = $1, result = $2::jsonb, completed_at = NOW() WHERE id = $3', ['completed', JSON.stringify(safeJson(result)), stepId]);
      return result;
    } catch (error) {
      const payload = serializeError(error, stepName);
      await this.pool.query('UPDATE workflow_steps SET status = $1, result = $2::jsonb, completed_at = NOW() WHERE id = $3', ['failed', JSON.stringify(payload), stepId]);
      throw error;
    }
  }

  async skipStep(workflowRunId, stepName, result) {
    return this.completeStep(workflowRunId, stepName, result, 'skipped');
  }

  async completeStep(workflowRunId, stepName, result, status = 'completed') {
    await this.pool.query(
      'INSERT INTO workflow_steps (workflow_run_id, step_name, status, result, started_at, completed_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW()) ON CONFLICT DO NOTHING',
      [workflowRunId, stepName, status, JSON.stringify(result)]
    );
    await this.pool.query(
      `UPDATE workflow_steps
       SET status = $3,
           result = $4::jsonb,
           completed_at = NOW()
       WHERE workflow_run_id = $1 AND step_name = $2`,
      [workflowRunId, stepName, status, JSON.stringify(result)]
    );
  }

  async withTransaction(existingClient, fn, stage) {
    if (existingClient) return fn(existingClient);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof ProjectBootstrapError) throw error;
      throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.PERSIST_FAILED, error.message || 'Persistence failed.', stage, {}, true);
    } finally {
      client.release();
    }
  }

  async incrementAttempt(workflowRunId) {
    await this.pool.query('UPDATE workflow_runs SET attempt_count = COALESCE(attempt_count, 0) + 1, started_at = COALESCE(started_at, NOW()) WHERE id = $1', [workflowRunId]);
  }

  async updateWorkflow(id, status, statePatch = {}) {
    await this.pool.query(
      `UPDATE workflow_runs
       SET status = $1,
           state = COALESCE(state, '{}'::jsonb) || $2::jsonb,
           completed_at = CASE WHEN $1 IN ('completed','failed','blocked') THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $3`,
      [status, JSON.stringify(statePatch), id]
    );
  }

  async setWorkflowProject(workflowRunId, projectId, actionId) {
    await this.pool.query('UPDATE workflow_runs SET related_project_id = $1, updated_at = NOW() WHERE id = $2', [projectId, workflowRunId]);
    if (actionId) await this.pool.query('UPDATE api_actions SET related_project_id = $1 WHERE id = $2', [projectId, actionId]);
  }

  async recordActionEvent(actionId, eventType, actorUserId, payload = {}) {
    if (!actionId) return;
    await this.pool.query(
      'INSERT INTO api_action_events (action_id, event_type, actor_user_id, payload) VALUES ($1, $2, $3, $4::jsonb)',
      [actionId, eventType, actorUserId || null, JSON.stringify(payload)]
    );
  }

  async failWorkflow(workflow, error) {
    const payload = serializeError(error, error.stage || 'unknown', workflow);
    const status = error.code === BOOTSTRAP_ERROR_CODES.INPUT_INVALID || error.code === BOOTSTRAP_ERROR_CODES.PERMISSION_DENIED ? 'blocked' : 'failed';
    await this.pool.query(
      `UPDATE workflow_runs SET status = $1, last_error = $2::jsonb, state = COALESCE(state, '{}'::jsonb) || $3::jsonb, completed_at = NOW(), updated_at = NOW() WHERE id = $4`,
      [status, JSON.stringify(payload), JSON.stringify({ error: payload }), workflow.id]
    );
    if (workflow.action_id) {
      await this.pool.query('UPDATE api_actions SET status = $1, execution_result = $2::jsonb WHERE id = $3', ['failed', JSON.stringify(payload), workflow.action_id]);
      await this.recordActionEvent(workflow.action_id, 'action.failed', workflow.actor_user_id, payload);
    }
    return payload;
  }
}

function normalizeText(value, maxLength) {
  return limitText(value, maxLength);
}

function limitText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.INPUT_INVALID, 'Due date is not parseable.', 'validateInput', { field: 'dueDate' });
  }
  return parsed.toISOString();
}

function normalizeLocation(value) {
  if (!value) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ProjectBootstrapError(BOOTSTRAP_ERROR_CODES.INPUT_INVALID, 'Unsupported location shape.', 'validateInput', { field: 'location' });
  }
  return value;
}

function isActiveStatus(status) {
  return typeof status === 'string' && /^(active|urgent|ready|open|available|in_progress)/i.test(status);
}

function serializeError(error, stage, workflow = {}) {
  return {
    code: error.code || BOOTSTRAP_ERROR_CODES.PERSIST_FAILED,
    message: error.message || 'Project bootstrap failed.',
    stage,
    retryable: Boolean(error.retryable),
    attempt: Number(workflow.attempt_count || 0) + 1,
    workflowRunId: workflow.id,
    actionId: workflow.action_id,
    details: safeJson(error.details || {}),
    timestamp: new Date().toISOString()
  };
}

function safeJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export { ProjectBootstrapError, isActiveStatus };
export default new ProjectBootstrapService();
