import { create } from 'zustand';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const useNarrativeStore = create((set) => ({
  loading: false,
  error: null,

  // Chronicle 2.0: Layered narrative arcs
  chronicleArcs: [], // Array of { id, type: 'mission'|'growth', label, stories: [] }

  // StoryNode Evolution: Narrative infrastructure
  storyGraph: {
    nodes: [], // { id, label, type, size }
    links: []  // { source, target }
  },

  // Mentorship Lineage: Knowledge inheritance
  mentorshipLineage: [],

  // Impact Propagation Engine: Downstream effects
  impactChains: [],

  // Institutional Memory Archive
  institutionalMemory: [],

  playbackEvents: [],

  // Actions
  fetchNarrativeData: async (userId) => {
    set({ loading: true });
    try {
      const [constellation, lineage, propagation, arcs, memory, playback] = await Promise.all([
        axios.get(`${BACKEND_URL}/narrative/user/${userId}/constellation`),
        axios.get(`${BACKEND_URL}/narrative/user/${userId}/lineage`),
        axios.get(`${BACKEND_URL}/narrative/user/${userId}/propagation`),
        axios.get(`${BACKEND_URL}/narrative/user/${userId}/chronicle-arcs`),
        axios.get(`${BACKEND_URL}/narrative/institutional-memory`),
        axios.get(`${BACKEND_URL}/narrative/user/${userId}/playback`)
      ]);

      set({
        storyGraph: constellation.data,
        mentorshipLineage: lineage.data,
        impactChains: propagation.data,
        chronicleArcs: arcs.data,
        institutionalMemory: memory.data,
        playbackEvents: playback.data,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  setChronicleArcs: (arcs) => set({ chronicleArcs: arcs }),

  updateStoryGraph: (nodes, links) => set((state) => ({
    storyGraph: {
      nodes: nodes || state.storyGraph.nodes,
      links: links || state.storyGraph.links
    }
  })),

  setMentorshipLineage: (lineage) => set({ mentorshipLineage: lineage }),

  setImpactChains: (chains) => set({ impactChains: chains }),

  setInstitutionalMemory: (memory) => set({ institutionalMemory: memory }),

  addStoryToArc: (arcId, story) => set((state) => ({
    chronicleArcs: state.chronicleArcs.map(arc =>
      arc.id === arcId ? { ...arc, stories: [...arc.stories, story] } : arc
    )
  }))
}));
