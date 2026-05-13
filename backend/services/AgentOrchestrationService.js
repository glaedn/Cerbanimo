import { getTemporalClient } from '../workers/temporalWorker.js';
import { getAgentsForEvent, getScopeForEvent } from '../utils/agentRouting.js';
import * as activities from '../activities/agentActivities.js';

class AgentOrchestrationService {
  /**
   * Dispatches an event to relevant agents, using Temporal if available,
   * or running them locally as a fallback.
   */
  async runAgentsForEvent(event) {
    const { eventType } = event;
    const agentsToRun = getAgentsForEvent(eventType);

    if (agentsToRun.length === 0) return;

    const scope = getScopeForEvent(event);

    try {
      const client = await getTemporalClient();
      if (client) {
        console.log(`AgentOrchestration: Dispatching ${agentsToRun.join(', ')} via Temporal for ${eventType}`);
        await client.workflow.start('agentEventWorkflow', {
          taskQueue: 'agent-coordination',
          workflowId: `agent-event-${event.id || Date.now()}`,
          args: [event]
        });
      } else {
        await this.runAgentsLocally(agentsToRun, scope);
      }
    } catch (err) {
      console.warn('AgentOrchestration: Temporal dispatch failed, falling back to local execution', err.message);
      await this.runAgentsLocally(agentsToRun, scope);
    }
  }

  /**
   * Runs agents in-process using the registered activities.
   */
  async runAgentsLocally(agentsToRun, scope) {
    console.log(`AgentOrchestration: Running ${agentsToRun.join(', ')} locally for scope ${JSON.stringify(scope)}`);

    for (const agentType of agentsToRun) {
      try {
        await activities.runAgentCycle(agentType, scope);
      } catch (err) {
        console.error(`AgentOrchestration: Local execution failed for ${agentType}`, err);
      }
    }
  }
}

export default new AgentOrchestrationService();
