import { create } from 'zustand';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useGovernanceStore = create((set, get) => ({
  proposals: [],
  community: null,
  activeConstitution: null,
  constitutionVersions: [],
  delegations: [],
  treaties: [],
  deliberationTrees: {}, // { proposalId: { nodes, links } }
  simulations: [],
  mediationCases: [],
  loading: false,
  error: null,

  // Fetching Data
  fetchCommunityGovernance: async (communityId, token) => {
    set({ loading: true, error: null });
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const [propRes, constRes, delRes, commRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/proposals`, config),
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/constitution`, config),
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`, config),
        axios.get(`${BACKEND_URL}/communities/${communityId}`, config)
      ]);

      set({
        proposals: propRes.data,
        activeConstitution: constRes.data,
        delegations: delRes.data,
        community: commRes.data,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchFederationAtlas: async (token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${BACKEND_URL}/federation/atlas`, config);
      set({ treaties: res.data });
    } catch (err) {
      console.error('Error fetching federation atlas:', err);
    }
  },

  // Proposal Actions
  addProposal: (proposal) => set((state) => ({
    proposals: [proposal, ...state.proposals]
  })),

  updateProposalStatus: (proposalId, status) => set((state) => ({
    proposals: state.proposals.map(p => p.id === proposalId ? { ...p, status } : p)
  })),

  castVote: async (proposalId, voteValue, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${BACKEND_URL}/governance/proposals/${proposalId}/vote`, { voteValue }, config);
      return true;
    } catch (err) {
      console.error('Error casting vote:', err);
      throw err;
    }
  },

  executeProposal: async (proposalId, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${BACKEND_URL}/governance/proposals/${proposalId}/execute`, {}, config);
      return res.data;
    } catch (err) {
      console.error('Error executing proposal:', err);
      throw err;
    }
  },

  createProposal: async (communityId, proposalData, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${BACKEND_URL}/governance/community/${communityId}/proposals`, proposalData, config);
      set(state => ({ proposals: [res.data, ...state.proposals] }));
      return res.data;
    } catch (err) {
      console.error('Error creating proposal:', err);
      throw err;
    }
  },

  // Deliberation logic
  fetchDeliberation: async (proposalId, token) => {
    set((state) => ({
      deliberationTrees: {
        ...state.deliberationTrees,
        [proposalId]: state.deliberationTrees[proposalId] || { nodes: [], links: [] }
      }
    }));
    // In a real implementation, we would fetch from backend here using token
  },

  addArgument: (proposalId, argument) => set((state) => {
    const tree = state.deliberationTrees[proposalId] || { nodes: [], links: [] };
    return {
      deliberationTrees: {
        ...state.deliberationTrees,
        [proposalId]: {
          ...tree,
          nodes: [...tree.nodes, argument]
        }
      }
    };
  }),

  // Delegation logic
  addDelegation: async (communityId, userId, delegateToId, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${BACKEND_URL}/communities/${communityId}/delegate/${userId}`,
        { delegateTo: delegateToId },
        config
      );
      // Refresh delegations
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`, config);
      set({ delegations: res.data });
    } catch (err) {
      console.error('Error adding delegation:', err);
    }
  },

  revokeDelegation: async (communityId, userId, token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${BACKEND_URL}/communities/${communityId}/revoke/${userId}`,
        {},
        config
      );
      // Refresh delegations
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`, config);
      set({ delegations: res.data });
    } catch (err) {
      console.error('Error revoking delegation:', err);
    }
  },

  // Mediation Actions
  fetchMediationCases: async (communityId, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/mediation`, config);
      set({ mediationCases: res.data });
    } catch (err) {
      console.error('Error fetching mediation cases:', err);
    }
  },

  // Constitutional history
  fetchConstitutionVersions: async (communityId, token) => {
     try {
       const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
       const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/constitution/history`, config);
       set({ constitutionVersions: res.data });
     } catch (err) {
       console.error('Error fetching constitution history:', err);
     }
  }
}));
