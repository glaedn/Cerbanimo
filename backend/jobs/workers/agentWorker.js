import boss from '../boss.js';
import * as activities from '../../activities/agentActivities.js';
import {
  createWorkflowRun,
  updateWorkflowRun,
  createWorkflowStep,
  completeWorkflowStep,
  failWorkflowStep
} from './workflowTracker.js';

export async function startAgentWorker() {
  console.log('Starting Agent Worker...');

  await boss.work('agent-execution', async (job) => {
    const { agentType, scope, eventId, eventType } = job.data;
    console.log(`Job received: agent-execution for ${agentType}`);

    // Start tracking this as a workflow run
    const runId = await createWorkflowRun(`agent-${agentType}`, {
      scope,
      eventId,
      eventType
    });

    const stepId = await createWorkflowStep(runId, 'processCycle', { agentType, scope });

    try {
      const result = await activities.runAgentCycle(agentType, scope);

      await completeWorkflowStep(stepId, result);
      await updateWorkflowRun(runId, 'completed');

      return result;
    } catch (err) {
      console.error(`Agent worker failed for ${agentType}:`, err);

      await failWorkflowStep(stepId, err);
      await updateWorkflowRun(runId, 'failed');

      throw err;
    }
  });
}
