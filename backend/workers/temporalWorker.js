import { Worker } from '@temporalio/worker';
import * as activities from '../activities/agentActivities.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startTemporalWorker() {
  try {
    const worker = await Worker.create({
      workflowsPath: path.resolve(__dirname, '../workflows/agentWorkflows.js'),
      activities,
      taskQueue: 'agent-coordination',
    });

    console.log('Temporal Worker: Starting...');
    // We don't await here so it doesn't block server startup
    worker.run().catch(err => {
      console.error('Temporal Worker: Run failed', err);
    });

    console.log('Temporal Worker: Registered and running in background');
  } catch (err) {
    console.warn('Temporal Worker: Failed to start. Agents will not run automatically.', err.message);
  }
}
