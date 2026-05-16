import boss from '../../boss.js';
import GovernanceService from '../../../services/GovernanceService.js';
import StoryEngineService from '../../../services/StoryEngineService.js';
import {
  createWorkflowRun,
  updateWorkflowRun,
  createWorkflowStep,
  completeWorkflowStep,
  failWorkflowStep
} from '../workflowTracker.js';

export async function startDomainWorkers() {
  console.log('Starting Domain Workers...');

  // Governance Proposal Execution
  await boss.work('governance-execution', async (job) => {
    const { proposalId } = job.data;
    console.log(`Job received: governance-execution for proposal ${proposalId}`);

    const runId = await createWorkflowRun('governance-execution', { proposalId });
    const stepId = await createWorkflowStep(runId, 'executeProposal', { proposalId });

    try {
      const result = await GovernanceService.executeProposalInternal(proposalId);
      await completeWorkflowStep(stepId, result);
      await updateWorkflowRun(runId, 'completed');
      return result;
    } catch (err) {
      console.error(`Governance execution failed for ${proposalId}:`, err);
      await failWorkflowStep(stepId, err);
      await updateWorkflowRun(runId, 'failed');
      throw err;
    }
  });

  // Story/Narrative Generation
  await boss.work('chronicle-generation', async (job) => {
    const { type, payload } = job.data;
    console.log(`Job received: chronicle-generation for type ${type}`);

    const runId = await createWorkflowRun(`chronicle-${type}`, { type, payload });
    const stepId = await createWorkflowStep(runId, 'generateStory', { type, payload });

    try {
      let result;
      if (type === 'fromNeed') {
        result = await StoryEngineService.createFromNeedInternal(payload);
      } else if (type === 'userPatterns') {
        result = await StoryEngineService.detectUserPatternsInternal(payload.userId);
      } else {
        throw new Error(`Unknown chronicle generation type: ${type}`);
      }

      await completeWorkflowStep(stepId, result);
      await updateWorkflowRun(runId, 'completed');
      return result;
    } catch (err) {
      console.error(`Chronicle generation failed:`, err);
      await failWorkflowStep(stepId, err);
      await updateWorkflowRun(runId, 'failed');
      throw err;
    }
  });
}
