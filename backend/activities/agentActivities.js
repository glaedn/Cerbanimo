import NeedAgent from '../services/agents/NeedAgent.js';
import MissionAgent from '../services/agents/MissionAgent.js';
import CommunityAgent from '../services/agents/CommunityAgent.js';
import UserGrowthAgent from '../services/agents/UserGrowthAgent.js';
import FederationAgent from '../services/agents/FederationAgent.js';
import GovernanceAgent from '../services/agents/GovernanceAgent.js';
import ConstitutionalAgent from '../services/agents/ConstitutionalAgent.js';
import DispatchAgent from '../services/agents/DispatchAgent.js';

export async function runAgentCycle(agentType, scope) {
  console.log(`Activity: Running ${agentType} for scope ${JSON.stringify(scope)}`);

  let agent;
  switch (agentType) {
    case 'NeedAgent':
      agent = new NeedAgent(scope);
      break;
    case 'MissionAgent':
      agent = new MissionAgent(scope);
      break;
    case 'CommunityAgent':
      agent = new CommunityAgent(scope);
      break;
    case 'UserGrowthAgent':
      agent = new UserGrowthAgent(scope);
      break;
    case 'FederationAgent':
      agent = new FederationAgent(scope);
      break;
    case 'GovernanceAgent':
      agent = new GovernanceAgent(scope);
      break;
    case 'ConstitutionalAgent':
      agent = new ConstitutionalAgent(scope);
      break;
    case 'DispatchAgent':
      agent = new DispatchAgent(scope);
      break;
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }

  await agent.processCycle();
  return { status: 'success', agent: agentType };
}
