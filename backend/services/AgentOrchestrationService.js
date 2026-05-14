import boss from '../jobs/boss.js';
import { getAgentsForEvent, getScopeForEvent } from '../utils/agentRouting.js';
import * as activities from '../activities/agentActivities.js';

class AgentOrchestrationService {
  /**
   * Dispatches an event to relevant agents using pg-boss.
   */
  async runAgentsForEvent(event) {
    const { eventType } = event;
    const agentsToRun = getAgentsForEvent(eventType);

    if (agentsToRun.length === 0) return;

    const scope = getScopeForEvent(event);

    console.log(`AgentOrchestration: Dispatching ${agentsToRun.join(', ')} via pg-boss for ${eventType}`);

    for (const agentType of agentsToRun) {
      try {
        await boss.send('agent-execution', {
          agentType,
          scope,
          eventId: event.id,
          eventType
        });
      } catch (err) {
        console.warn(`AgentOrchestration: pg-boss dispatch failed for ${agentType}, falling back to local execution`, err.message);
        await activities.runAgentCycle(agentType, scope);
      }
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
