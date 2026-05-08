import { proxyActivities } from '@temporalio/workflow';

const { runAgentCycle } = proxyActivities({
  startToCloseTimeout: '5 minutes',
});

/**
 * Orchestrates agent responses to civic events.
 */
export async function agentEventWorkflow(event) {
  const { eventType } = event;

  // Determine which agents should respond to this event
  const agentsToRun = [];

  if (eventType === 'need.created') {
    agentsToRun.push('NeedAgent');
    agentsToRun.push('CommunityAgent');
  } else if (eventType === 'task.completed') {
    agentsToRun.push('MissionAgent');
    agentsToRun.push('UserGrowthAgent');
  } else if (eventType === 'project.created') {
    agentsToRun.push('MissionAgent');
  }

  // Run agents sequentially for now
  for (const agentType of agentsToRun) {
    await runAgentCycle(agentType, { type: 'global', id: null });
  }

  return { processedAgents: agentsToRun };
}
