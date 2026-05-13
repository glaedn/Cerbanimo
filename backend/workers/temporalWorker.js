import { Worker } from '@temporalio/worker';
import { Connection, Client } from '@temporalio/client';
import * as activities from '../activities/agentActivities.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let client = null;

export async function getTemporalClient() {
  if (client) return client;

  try {
    const connection = await Connection.connect();
    client = new Client({ connection });
    return client;
  } catch (err) {
    console.error('Temporal Client: Failed to connect', err);
    return null;
  }
}

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
    console.info('Temporal Worker: Not started (Temporal server unreachable). Agents will run in local fallback mode.', err.message);
  }
}
