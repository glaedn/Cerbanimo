import pool from '../db.js';
import TaskAccessService from './TaskAccessService.js';

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
    return TaskAccessService.loadTask(taskId, client);
  }

  policyForTaskRecord(task, authContext = {}) {
    const access = TaskAccessService.policyForTaskRecord(task, authContext);

    return {
      exists: true,
      taskId: task.id,
      actorUserId: access.actorUserId,
      basis: access.basis,
      canViewTaskAutomation: access.canViewTaskAutomation,
      canCreatePreparation: access.canCreatePreparation,
      canEditPreparation: access.canEditPreparation,
      canPreviewAutomation: access.canPreviewAutomation,
      canConfirmAutomation: access.canConfirmAutomation,
      canExecuteAutomation: access.canExecuteAutomation,
      canSubmitAutomationResult: access.canSubmitAutomationResult
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
