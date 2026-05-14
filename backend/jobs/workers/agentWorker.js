import boss from '../boss.js';
import * as activities from '../../activities/agentActivities.js';

export async function startAgentWorker() {
  console.log('Starting Agent Worker...');

  await boss.work('agent-execution', async (job) => {
    const { agentType, scope } = job.data;
    console.log(`Job received: agent-execution for ${agentType}`);

    try {
      const result = await activities.runAgentCycle(agentType, scope);
      return result;
    } catch (err) {
      console.error(`Agent worker failed for ${agentType}:`, err);
      throw err;
    }
  });
}
