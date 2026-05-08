import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Navigation & UI Context
  activeContext: 'normal', // 'normal', 'mission', 'crisis', 'governance', 'field'
  isLoFiMode: typeof localStorage !== 'undefined' ? localStorage.getItem('lofiMode') === 'true' : false,
  isCrisisMode: false,
  activeOverlays: [], // ['crisis', 'logistics', 'trust', 'governance', 'resource', 'comms']

  // Graph-Native State
  entities: {}, // Normalized map: { 'type-id': { ...data } }
  relationships: [], // Array of { source, target, type, strength }
  selectedEntity: null, // { type, id } or full object
  signals: [], // Legacy signals

  // F3 Real-Time State
  realtimeEvents: [],
  prioritizedSignals: [],
  presence: {}, // { scope_id: [user_ids] }

  // HUD Customization
  hudMode: 'normal', // 'normal' or 'operational'
  activePanels: ['signals', 'pulse', 'river', 'mission'], // Max 6
  collapsedPanels: [], // ['signals', etc]

  // Actions
  setHudMode: (mode) => set({ hudMode: mode }),
  setActiveContext: (context) => set({ activeContext: context }),

  togglePanel: (panelId) => set((state) => {
    if (state.activePanels.includes(panelId)) {
      return { activePanels: state.activePanels.filter(id => id !== panelId) };
    }
    if (state.activePanels.length >= 6) return state; // Limit
    return { activePanels: [...state.activePanels, panelId] };
  }),

  togglePanelCollapse: (panelId) => set((state) => ({
    collapsedPanels: state.collapsedPanels.includes(panelId)
      ? state.collapsedPanels.filter(id => id !== panelId)
      : [...state.collapsedPanels, panelId]
  })),

  toggleOverlay: (overlay) => set((state) => ({
    activeOverlays: state.activeOverlays.includes(overlay)
      ? state.activeOverlays.filter(o => o !== overlay)
      : [...state.activeOverlays, overlay]
  })),
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

  addRealtimeEvent: (event) => set((state) => ({
    realtimeEvents: [event, ...state.realtimeEvents].slice(0, 100)
  })),

  setPrioritizedSignals: (signals) => set({ prioritizedSignals: signals }),

  updatePresence: (scopeId, userIds) => set((state) => ({
    presence: { ...state.presence, [scopeId]: userIds }
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
