import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGovernanceStore } from './useGovernanceStore';
import axios from 'axios';

vi.mock('axios');

describe('useGovernanceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGovernanceStore.setState({
        proposals: [],
        community: null,
        activeConstitution: null,
        delegations: [],
        loading: false,
        error: null
    });
  });

  it('initializes with default state', () => {
    const state = useGovernanceStore.getState();
    expect(state.proposals).toEqual([]);
    expect(state.activeConstitution).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('addProposal adds a proposal to the stream', () => {
    const newProposal = { id: 1, title: 'Test' };
    useGovernanceStore.getState().addProposal(newProposal);
    expect(useGovernanceStore.getState().proposals).toContain(newProposal);
  });

  it('fetchCommunityGovernance updates state on success', async () => {
    const mockProposals = [{ id: 1, title: 'Prop 1' }];
    const mockConstitution = { version: 1 };
    const mockDelegations = [];
    const mockCommunity = { id: 123, name: 'Test' };

    axios.get.mockImplementation((url) => {
      if (url.includes('proposals')) return Promise.resolve({ data: mockProposals });
      if (url.includes('constitution')) return Promise.resolve({ data: mockConstitution });
      if (url.includes('delegations')) return Promise.resolve({ data: mockDelegations });
      if (url.match(/communities\/123$/)) return Promise.resolve({ data: mockCommunity });
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    await useGovernanceStore.getState().fetchCommunityGovernance(123);

    const state = useGovernanceStore.getState();
    expect(state.proposals).toEqual(mockProposals);
    expect(state.activeConstitution).toEqual(mockConstitution);
    expect(state.community).toEqual(mockCommunity);
    expect(state.loading).toBe(false);
  });

  it('addArgument updates deliberation tree', () => {
    const proposalId = 101;
    const argument = { id: 1, text: 'Strong support', type: 'support' };

    useGovernanceStore.getState().addArgument(proposalId, argument);

    const tree = useGovernanceStore.getState().deliberationTrees[proposalId];
    expect(tree.nodes).toContain(argument);
  });
});
