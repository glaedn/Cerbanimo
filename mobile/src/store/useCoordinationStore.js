import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useCoordinationStore = create(
  persist(
    (set, get) => ({
      isCrisisMode: false,
      lastLocation: null,
      fatigueLevel: 0,
      activeMissions: [],
      localSignals: [],
      syncStatus: "idle",

      toggleCrisisMode: () => set((state) => ({ isCrisisMode: !state.isCrisisMode })),

      setLastLocation: (location) => set({ lastLocation: location }),

      updateFatigue: (change) => set((state) => ({
        fatigueLevel: Math.min(Math.max(state.fatigueLevel + change, 0), 1)
      })),

      setSyncStatus: (status) => set({ syncStatus: status }),

      setMissions: (missions) => set({ activeMissions: missions }),
      setSignals: (signals) => set({ localSignals: signals })
    }),
    {
      name: "coordination-storage",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
