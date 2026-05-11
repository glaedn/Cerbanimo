import { create } from 'zustand';

export const useNarrativeStore = create((set) => ({
  // Chronicle 2.0: Layered narrative arcs
  chronicleArcs: [], // Array of { id, type: 'mission'|'growth', label, stories: [] }

  // StoryNode Evolution: Narrative infrastructure
  storyGraph: {
    nodes: [], // { id, type: 'operational'|'human'|'community'|'crisis'|'governance'|'mentorship', data }
    links: []  // { source, target, relationshipType }
  },

  // Narrative Trust System: Contextual reputation
  contextualTrust: {}, // { userId: { domain: { score, signals: [] } } }

  // Mentorship Lineage: Knowledge inheritance
  mentorshipLineage: {
    nodes: [], // Users
    links: []  // { mentorId, menteeId, skillsTransferred: [] }
  },

  // Impact Propagation Engine: Downstream effects
  impactChains: [], // Array of { rootContributionId, rippleEffects: [] }

  // Institutional Memory Archive
  institutionalMemory: [], // Array of { id, communityId, type: 'crisis'|'governance'|'ritual', content }

  // Actions
  setChronicleArcs: (arcs) => set({ chronicleArcs: arcs }),

  updateStoryGraph: (nodes, links) => set((state) => ({
    storyGraph: {
      nodes: nodes || state.storyGraph.nodes,
      links: links || state.storyGraph.links
    }
  })),

  setContextualTrust: (userId, domainTrust) => set((state) => ({
    contextualTrust: { ...state.contextualTrust, [userId]: domainTrust }
  })),

  setMentorshipLineage: (lineage) => set({ mentorshipLineage: lineage }),

  setImpactChains: (chains) => set({ impactChains: chains }),

  setInstitutionalMemory: (memory) => set({ institutionalMemory: memory }),

  // Narrative discovery actions
  addStoryToArc: (arcId, story) => set((state) => ({
    chronicleArcs: state.chronicleArcs.map(arc =>
      arc.id === arcId ? { ...arc, stories: [...arc.stories, story] } : arc
    )
  }))
}));
