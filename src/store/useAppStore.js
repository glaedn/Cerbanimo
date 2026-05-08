import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Navigation & UI Context
  activeContext: 'dashboard', // e.g., 'dashboard', 'governance', 'mission', 'crisis'
  isLoFiMode: localStorage.getItem('lofiMode') === 'true',
  isCrisisMode: false,

  // Actions
  setActiveContext: (context) => set({ activeContext: context }),
  setLoFiMode: (enabled) => {
    localStorage.setItem('lofiMode', enabled);
    set({ isLoFiMode: enabled });
  },
  setCrisisMode: (enabled) => set({ isCrisisMode: enabled }),

  // Notification Badge state (if needed globally)
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
