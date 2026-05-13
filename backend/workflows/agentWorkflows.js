import { proxyActivities } from '@temporalio/workflow';
import { getAgentsForEvent, getScopeForEvent } from '../utils/agentRouting.js';

const { runAgentCycle } = proxyActivities({
  startToCloseTimeout: '5 minutes',
});

/**
 * Orchestrates agent responses to civic events.
 */
export async function agentEventWorkflow(event) {
  const { eventType } = event;

  // Determine which agents should respond to this event
  const agentsToRun = getAgentsForEvent(eventType);

  // Determine scope from event payload
  const scope = getScopeForEvent(event);

  // Run agents sequentially for now
  for (const agentType of agentsToRun) {
    await runAgentCycle(agentType, scope);
  }

  return { processedAgents: agentsToRun };
}
