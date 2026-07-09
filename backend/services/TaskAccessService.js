import pool from '../db.js';

const serviceScopes = new Set([
  'actions:service',
  'task_automation:service',
  'automation:service',
  'evidence:service'
]);

const decisionNames = [
  'canViewTask',
  'canViewTaskAutomation',
  'canCreatePreparation',
  'canEditPreparation',
  'canPreviewAutomation',
  'canConfirmAutomation',
  'canExecuteAutomation',
  'canSubmitAutomationResult',
  'canViewEvidence',
  'canSubmitEvidence'
];

function normalizeActor(authContext = {}) {
  const actorUserId = Number(authContext.actorUserId || authContext.userId || 0);
  const scopes = new Set(authContext.scopes || []);
  const roles = new Set(authContext.roles || []);
  return {
    actorUserId: actorUserId > 0 ? actorUserId : null,
    scopes,
    roles,
    serviceActor: Boolean(authContext.isServiceActor) || [...serviceScopes].some(scope => scopes.has(scope)),
    admin: roles.has('admin')
  };
}

function decision(allowed, reason, code, basis) {
  return allowed
    ? { allowed: true, reason: reason || 'Task access authorized.', basis }
    : { allowed: false, code: code || 'TASK_ACCESS_DENIED', reason: reason || 'Task access is not authorized for this actor.', basis };
}

class TaskAccessService {
  async loadTask(taskId, client = pool) {
    const result = await client.query(
      `SELECT t.*,
              p.creator_id AS project_creator_id,
              p.visibility AS project_visibility,
              p.status AS project_status,
              p.community_id AS project_community_id
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE t.id::text = $1
       LIMIT 1`,
      [String(taskId)]
    );
    return result.rows[0] || null;
  }

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
      const error = new Error(policy[decisionName]?.reason || 'Task access denied.');
      error.status = 403;
      error.code = policy[decisionName]?.code || 'TASK_ACCESS_DENIED';
      throw error;
    }
    return policy;
  }

  policyForTaskRecord(task, authContext = {}) {
    const actor = normalizeActor(authContext);
    const assignedIds = Array.isArray(task.assigned_user_ids) ? task.assigned_user_ids.map(Number) : [];
    const policy = task.automation_policy || task.task_automation_policy || {};
    const grantedActors = Array.isArray(policy.automationActorUserIds)
      ? policy.automationActorUserIds.map(Number)
      : [];
    const evidenceActors = Array.isArray(policy.evidenceActorUserIds)
      ? policy.evidenceActorUserIds.map(Number)
      : [];
    const actorUserId = actor.actorUserId;
    const assignedActor = Boolean(actorUserId && assignedIds.includes(actorUserId));
    const taskCreator = Boolean(actorUserId && Number(task.creator_id) === actorUserId);
    const projectCreator = Boolean(actorUserId && Number(task.project_creator_id) === actorUserId);
    const policyGranted = Boolean(actorUserId && [...grantedActors, ...evidenceActors].includes(actorUserId));
    const authenticated = Boolean(actorUserId);
    const visibility = String(task.project_visibility || 'public').toLowerCase();
    const publicVisible = authenticated && !['private', 'invite_only', 'members', 'restricted'].includes(visibility);

    const taskAuthority = actor.serviceActor || actor.admin || assignedActor || taskCreator || projectCreator || policyGranted;
    const canView = taskAuthority || publicVisible;
    const basis = {
      serviceActor: actor.serviceActor,
      admin: actor.admin,
      assignedActor,
      taskCreator,
      projectCreator,
      policyGranted,
      publicVisible,
      projectVisibility: visibility
    };
    const authorityReason = 'Task access requires task assignment, task/project ownership, project-manager authority, service authority, or explicit task policy.';
    const viewDecision = decision(canView, canView ? 'Task is visible to this actor.' : authorityReason, 'TASK_VISIBILITY_DENIED', basis);
    const authorityDecision = decision(taskAuthority, taskAuthority ? 'Task authority confirmed.' : authorityReason, 'TASK_AUTHORITY_REQUIRED', basis);

    return {
      exists: true,
      taskId: task.id,
      actorUserId,
      basis,
      canViewTask: viewDecision,
      canViewTaskAutomation: viewDecision,
      canCreatePreparation: authorityDecision,
      canEditPreparation: authorityDecision,
      canPreviewAutomation: authorityDecision,
      canConfirmAutomation: authorityDecision,
      canExecuteAutomation: authorityDecision,
      canSubmitAutomationResult: authorityDecision,
      canViewEvidence: viewDecision,
      canSubmitEvidence: authorityDecision
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

export default new TaskAccessService();
