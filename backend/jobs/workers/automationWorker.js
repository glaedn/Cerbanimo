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
    const { runId, templateKey } = job.data;
    console.log(`Job received: automation-execution for run ${runId} (${templateKey})`);

    const workflowRunId = await createWorkflowRun(`automation-${templateKey || 'unknown'}`, {
      runId,
      templateKey
    });
    const stepId = await createWorkflowStep(workflowRunId, 'executeAutomation', { runId, templateKey });

    try {
      const result = await AutomationWorkerService.run(runId);
      await completeWorkflowStep(stepId, result);
      await updateWorkflowRun(workflowRunId, result.status === 'blocked' ? 'blocked' : 'completed');
      return result;
    } catch (err) {
      console.error(`Automation worker failed for run ${runId}:`, err);
      await failWorkflowStep(stepId, err);
      await updateWorkflowRun(workflowRunId, 'failed');
      throw err;
    }
  });
}

