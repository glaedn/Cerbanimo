import boss from '../boss.js';
import AutomationWorkerService from '../../services/AutomationWorkerService.js';
import {
  createWorkflowRun,
  updateWorkflowRun,
  createWorkflowStep,
  completeWorkflowStep,
  failWorkflowStep
} from './workflowTracker.js';

export const AUTOMATION_EXECUTION_QUEUE = 'automation-execution';

export async function startAutomationWorker() {
  console.log('Starting Automation Worker...');

  await boss.work(AUTOMATION_EXECUTION_QUEUE, async (job) => {
    const { runId, automationRunId, templateKey } = normalizeAutomationJobPayload(job);
    const durableRunId = automationRunId || runId;
    if (!durableRunId) throw new Error('automationRunId is required for automation-execution jobs');
    console.log(`Job received: automation-execution for run ${durableRunId} (${templateKey})`);

    const workflowRunId = await createWorkflowRun(`automation-${templateKey || 'unknown'}`, {
      runId: durableRunId,
      templateKey
    });
    const stepId = await createWorkflowStep(workflowRunId, 'executeAutomation', { runId: durableRunId, templateKey });

    try {
      const result = await AutomationWorkerService.run(durableRunId);
      await completeWorkflowStep(stepId, result);
      await updateWorkflowRun(workflowRunId, result.status === 'blocked' ? 'blocked' : 'completed');
      return result;
    } catch (err) {
      console.error(`Automation worker failed for run ${durableRunId}:`, err);
      await failWorkflowStep(stepId, err);
      await updateWorkflowRun(workflowRunId, 'failed');
      throw err;
    }
  });
}

export function normalizeAutomationJobPayload(job) {
  if (!job) return {};
  if (Array.isArray(job)) return normalizeAutomationJobPayload(job[0]);
  if (job.data && typeof job.data === 'object') return job.data;
  if (typeof job === 'object') return job;
  return {};
}
