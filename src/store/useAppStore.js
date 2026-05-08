import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Navigation & UI Context
  activeContext: 'dashboard', // e.g., 'dashboard', 'governance', 'mission', 'crisis'
  isLoFiMode: typeof localStorage !== 'undefined' ? localStorage.getItem('lofiMode') === 'true' : false,
  isCrisisMode: false,

  // Graph-Native State
  entities: {}, // Normalized map: { 'type-id': { ...data } }
  relationships: [], // Array of { source, target, type, strength }
  selectedEntity: null, // { type, id } or full object
  signals: [], // Proactive coordination signals

  // Actions
  setActiveContext: (context) => set({ activeContext: context }),
  setLoFiMode: (enabled) => {
    localStorage.setItem('lofiMode', enabled);
    set({ isLoFiMode: enabled });
  },
  setCrisisMode: (enabled) => set({ isCrisisMode: enabled }),

  // Graph Actions
  setEntities: (entities) => set({ entities }),
  setRelationships: (relationships) => set({ relationships }),
  selectEntity: (entity) => set({ selectedEntity: entity }),
  addSignals: (newSignals) => set((state) => ({
    signals: [...newSignals, ...state.signals].slice(0, 50)
  })),
  updateGraph: (nodes, links) => set((state) => {
    const newEntities = { ...state.entities };
    nodes.forEach(node => {
      newEntities[node.id] = node;
    });
    return {
      entities: newEntities,
      relationships: links
    };
  }),

  // Notification Badge state
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
