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

  if (eventType === 'need.created' || eventType === 'need.escalated') {
    agentsToRun.push('NeedAgent');
    agentsToRun.push('CommunityAgent');
  } else if (eventType === 'task.completed') {
    agentsToRun.push('MissionAgent');
    agentsToRun.push('UserGrowthAgent');
  } else if (eventType === 'project.created') {
    agentsToRun.push('MissionAgent');
  } else if (eventType === 'treaty.proposed' || eventType === 'treaty.contribution_enforced') {
    agentsToRun.push('FederationAgent');
  } else if (eventType === 'crisis.triggered') {
    agentsToRun.push('CommunityAgent');
    agentsToRun.push('FederationAgent');
  } else if (eventType === 'bounty.created') {
    agentsToRun.push('MissionAgent');
  } else if (eventType === 'solidarity_draw.executed') {
    agentsToRun.push('CommunityAgent');
  } else if (eventType === 'governance.proposal_created') {
    agentsToRun.push('GovernanceAgent');
    agentsToRun.push('ConstitutionalAgent');
  } else if (eventType === 'community.alert') {
    agentsToRun.push('CommunityAgent');
  } else if (eventType === 'impact.verified') {
    agentsToRun.push('UserGrowthAgent');
    agentsToRun.push('MissionAgent');
  }

  // Determine scope from event payload if communityId is present
  const scope = event.payload?.communityId
    ? { type: 'community', id: event.payload.communityId }
    : { type: 'global', id: null };

  // Run agents sequentially for now
  for (const agentType of agentsToRun) {
    await runAgentCycle(agentType, scope);
  }

  return { processedAgents: agentsToRun };
}
