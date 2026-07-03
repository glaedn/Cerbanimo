import boss from '../boss.js';
import ProjectBootstrapService from '../../services/ProjectBootstrapService.js';

export const PROJECT_BOOTSTRAP_QUEUE = 'project-bootstrap';

export async function startProjectBootstrapWorker() {
  console.log('Starting Project Bootstrap Worker...');
  await boss.work(PROJECT_BOOTSTRAP_QUEUE, { retryLimit: 3, retryDelay: 10, retryBackoff: true }, async (job) => {
    const { workflowRunId } = job.data || {};
    if (!workflowRunId) throw new Error('workflowRunId is required for project-bootstrap jobs');
    return ProjectBootstrapService.bootstrapFromWorkflow(workflowRunId);
  });
}
