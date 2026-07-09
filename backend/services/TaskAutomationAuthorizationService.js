import pool from '../db.js';

const serviceScopes = new Set([
  'actions:service',
  'task_automation:service',
  'automation:service'
]);

const decisionNames = [
  'canViewTaskAutomation',
  'canCreatePreparation',
  'canEditPreparation',
  'canPreviewAutomation',
  'canConfirmAutomation',
  'canExecuteAutomation',
  'canSubmitAutomationResult'
];

class TaskAutomationAuthorizationService {
  async policyForTask(taskId, authContext = {}, client = pool) {
    const task = await this.loadTask(taskId, client);
    if (!task) return this.notFound();
    return this.policyForTaskRecord(task, authContext);
  }

  async assert(taskId, authContext = {}, decisionName, client = pool) {
    const policy = await this.policyForTask(taskId, authContext, client);
    if (!policy.exists) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }
    if (!policy[decisionName]?.allowed) {
      const error = new Error(policy[decisionName]?.reason || 'Task automation is not authorized for this actor.');
      error.status = 403;
      error.code = policy[decisionName]?.code || 'TASK_AUTOMATION_DENIED';
      throw error;
    }
    return policy;
  }

  async canViewTaskAutomation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canViewTaskAutomation;
  }

  async canCreatePreparation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canCreatePreparation;
  }

  async canEditPreparation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canEditPreparation;
  }

  async canPreviewAutomation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canPreviewAutomation;
  }

  async canConfirmAutomation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canConfirmAutomation;
  }

  async canExecuteAutomation(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canExecuteAutomation;
  }

  async canSubmitAutomationResult(taskId, authContext = {}, client = pool) {
    return (await this.policyForTask(taskId, authContext, client)).canSubmitAutomationResult;
  }

  async loadTask(taskId, client = pool) {
    const result = await client.query(
      `SELECT t.*,
              p.creator_id AS project_creator_id,
              p.status AS project_status
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id::text = $1
       LIMIT 1`,
      [String(taskId)]
    );
    return result.rows[0] || null;
  }

  policyForTaskRecord(task, authContext = {}) {
    const actorUserId = Number(authContext.actorUserId || authContext.userId || 0);
    const scopes = new Set(authContext.scopes || []);
    const roles = new Set(authContext.roles || []);
    const assignedIds = Array.isArray(task.assigned_user_ids) ? task.assigned_user_ids.map(Number) : [];
    const policy = task.automation_policy || task.task_automation_policy || {};
    const grantedActors = Array.isArray(policy.automationActorUserIds)
      ? policy.automationActorUserIds.map(Number)
      : [];

    const serviceActor = Boolean(authContext.isServiceActor)
      || [...serviceScopes].some(scope => scopes.has(scope));
    const assignedActor = actorUserId > 0 && assignedIds.includes(actorUserId);
    const taskCreator = actorUserId > 0 && Number(task.creator_id) === actorUserId;
    const projectCreator = actorUserId > 0 && Number(task.project_creator_id) === actorUserId;
    const admin = roles.has('admin');
    const policyGranted = actorUserId > 0 && grantedActors.includes(actorUserId);
    const canView = serviceActor || admin || actorUserId > 0;
    const canPrepare = serviceActor || assignedActor || taskCreator || projectCreator || admin || policyGranted;
    const canExecute = canPrepare;
    const canSubmit = serviceActor || assignedActor || taskCreator || projectCreator || admin || policyGranted;

    const basis = {
      serviceActor,
      assignedActor,
      taskCreator,
      projectCreator,
      admin,
      policyGranted
    };
    const allowDecision = { allowed: true, reason: 'Task automation authorized.', basis };
    const denyDecision = {
      allowed: false,
      code: 'TASK_AUTOMATION_AUTHORITY_REQUIRED',
      reason: 'Task automation requires task assignment, task/project ownership, project-manager authority, service authority, or explicit task policy.',
      basis
    };

    return {
      exists: true,
      taskId: task.id,
      actorUserId: actorUserId || null,
      basis,
      canViewTaskAutomation: canView ? allowDecision : denyDecision,
      canCreatePreparation: canPrepare ? allowDecision : denyDecision,
      canEditPreparation: canPrepare ? allowDecision : denyDecision,
      canPreviewAutomation: canPrepare ? allowDecision : denyDecision,
      canConfirmAutomation: canExecute ? allowDecision : denyDecision,
      canExecuteAutomation: canExecute ? allowDecision : denyDecision,
      canSubmitAutomationResult: canSubmit ? allowDecision : denyDecision
    };
  }

  notFound() {
    const denied = {
      allowed: false,
      code: 'TASK_NOT_FOUND',
      reason: 'Task not found.',
      basis: {}
    };
    return {
      exists: false,
      ...Object.fromEntries(decisionNames.map(name => [name, denied]))
    };
  }
}

export default new TaskAutomationAuthorizationService();
