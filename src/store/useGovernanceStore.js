import { create } from 'zustand';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useGovernanceStore = create((set, get) => ({
  proposals: [],
  activeConstitution: null,
  constitutionHistory: [],
  delegations: [],
  treaties: [],
  deliberationTrees: {}, // { proposalId: { nodes, links } }
  simulations: [],
  mediationCases: [],
  loading: false,
  error: null,

  // Fetching Data
  fetchCommunityGovernance: async (communityId) => {
    set({ loading: true, error: null });
    try {
      const [propRes, constRes, delRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/proposals`),
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/constitution`),
        axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`)
      ]);

      set({
        proposals: propRes.data,
        activeConstitution: constRes.data,
        delegations: delRes.data,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchFederationAtlas: async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/federation/atlas`);
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

  // Deliberation logic (Arguments/Mapping)
  // In a real system, these would likely be fetched from a dedicated deliberation table
  fetchDeliberation: async (proposalId) => {
    // Placeholder for structured reasoning
    // For now, we'll derive some basic nodes from proposal payload if available
    // or initialize an empty tree
    set((state) => ({
      deliberationTrees: {
        ...state.deliberationTrees,
        [proposalId]: state.deliberationTrees[proposalId] || { nodes: [], links: [] }
      }
    }));
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
      await axios.post(`${BACKEND_URL}/communities/${communityId}/delegate/${userId}`,
        { delegateTo: delegateToId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh delegations
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`);
      set({ delegations: res.data });
    } catch (err) {
      console.error('Error adding delegation:', err);
    }
  },

  revokeDelegation: async (communityId, userId, token) => {
    try {
      await axios.post(`${BACKEND_URL}/communities/${communityId}/revoke/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh delegations
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/delegations`);
      set({ delegations: res.data });
    } catch (err) {
      console.error('Error revoking delegation:', err);
    }
  },

  // Mediation Actions
  fetchMediationCases: async (communityId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/mediation`);
      set({ mediationCases: res.data });
    } catch (err) {
      console.error('Error fetching mediation cases:', err);
    }
  },

  // Constitutional history
  fetchConstitutionHistory: async (communityId) => {
     try {
       const res = await axios.get(`${BACKEND_URL}/governance/community/${communityId}/constitution/history`);
       set({ constitutionHistory: res.data });
     } catch (err) {
       console.error('Error fetching constitution history:', err);
     }
  }
}));
