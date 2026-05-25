import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../../db.js';
import GovernanceAgent from './GovernanceAgent.js';

vi.mock('../../db.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Mock the util that loadContext imports
vi.mock('../../utils/voteWeight.js', () => ({
  calculateVoteWeight: vi.fn().mockResolvedValue({ totalPossibleWeight: 100, weight: 10 }),
}));

describe('GovernanceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect participation risk', async () => {
    const agent = new GovernanceAgent();
    agent.instance = { id: 'agent-1' };

    // Mock loadContext queries
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          proposal_id: 101,
          community_id: 1,
          community_name: 'Community A',
          participation_rate: 0.05
        }]
      }) // participation query
      .mockResolvedValueOnce({ rows: [] }); // concentration query

    const context = await agent.loadContext();
    expect(context.risks).toContainEqual(expect.objectContaining({
      type: 'participation_risk',
      communityId: 1,
      proposalId: 101,
      rate: 0.05
    }));

    const reasoning = await agent.runReasoning(context);
    expect(reasoning.actions).toContainEqual(expect.objectContaining({
      type: 'record_risk'
    }));

    // Mock recordEvent
    agent.recordEvent = vi.fn();
    await agent.executeActions(reasoning.actions, context);
    expect(agent.recordEvent).toHaveBeenCalledWith(
        'governance.participation_risk',
        expect.objectContaining({ proposalId: 101, rate: 0.05 })
    );
  });
});
