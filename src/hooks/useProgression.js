import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';

/**
 * Hook to check if specific systems are unlocked.
 */
export const useProgression = () => {
  const { profile, loading } = useUserProfile();

  const unlockedSystems = useMemo(() => {
    if (loading) return {};
    return profile?.unlockedSystems || {};
  }, [profile, loading]);

  const isUnlocked = (systemKey) => {
    return !!unlockedSystems[systemKey];
  };

  return { unlockedSystems, isUnlocked, loading };
};
