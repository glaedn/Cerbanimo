import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../db.js';
import GovernanceService from './GovernanceService.js';

// Mock the pool and voteWeight
vi.mock('../db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('../utils/voteWeight.js', () => ({
  calculateVoteWeight: vi.fn(),
}));

import { calculateVoteWeight } from '../utils/voteWeight.js';

describe('GovernanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a proposal', async () => {
    const mockProposal = { id: 1, title: 'Test' };
    pool.query.mockResolvedValueOnce({ rows: [mockProposal] });

    const result = await GovernanceService.createProposal(1, 'governance', 'Test', 'Desc', {}, 1);

    expect(result).toEqual(mockProposal);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO proposals'),
      [1, 'governance', 'Test', 'Desc', {}, 1]
    );
  });

  it('tallies votes correctly', async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    pool.connect.mockResolvedValue(mockClient);

    mockClient.query
      .mockResolvedValueOnce({ // propRes
        rows: [{ id: 1, community_id: 1, proposal_type: 'governance', governance_config: { quorum: 0.1 } }]
      })
      .mockResolvedValueOnce({ // votesRes
        rows: [{ vote: true, weight: 10 }, { vote: false, weight: 5 }]
      });

    calculateVoteWeight.mockResolvedValue({ totalPossibleWeight: 100 });

    const result = await GovernanceService.tallyVotes(1);

    expect(calculateVoteWeight).toHaveBeenCalledWith(expect.anything(), 1, null, { domain: 'governance' });
    expect(result.passed).toBe(true);
    expect(result.turnout).toBe(0.15);
    expect(result.ratio).toBe(10/15);
  });
});
