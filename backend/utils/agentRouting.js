/**
 * Maps civic event types to the agents that should respond to them.
 */
export function getAgentsForEvent(eventType) {
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

  return agentsToRun;
}

/**
 * Determines the operational scope (global or community) for an agent based on the event payload.
 */
export function getScopeForEvent(event) {
  return event.payload?.communityId
    ? { type: 'community', id: event.payload.communityId }
    : { type: 'global', id: null };
}
