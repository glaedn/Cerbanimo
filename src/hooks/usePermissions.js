import { useUserProfile } from './useUserProfile';
import { useAppStore } from '../store/useAppStore';

/**
 * usePermissions Hook
 * Centralizes permission logic for the frontend, incorporating governance,
 * delegation, and crisis-mode roles.
 */
export const usePermissions = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { isCrisisMode } = useAppStore();

  // Basic role evaluation
  const isAdmin = profile?.id === 15; // Legacy admin check

  const canPropose = (communityId) => {
    if (isAdmin) return true;
    // logic for community membership or delegation
    return profile?.communities?.some(c => c.id === communityId) || false;
  };

  const canVote = (proposal) => {
    if (isCrisisMode) {
      // In crisis mode, voting might be restricted to specific roles
      return profile?.crisis_roles?.includes('responder') || false;
    }
    return true; // Simplified default
  };

  const hasDelegatedAuthority = (granterId, domain) => {
    // Check against profile.delegations if implemented
    return profile?.delegations?.some(d => d.granter_id === granterId && d.domain === domain) || false;
  };

  const getScopedPermissions = (scopeType, scopeId) => {
    // Returns permissions specific to a community, project, or mission
    return {
      canEdit: isAdmin || hasDelegatedAuthority(scopeId, 'admin'),
      canJoin: true,
      canDelete: isAdmin
    };
  };

  return {
    isAdmin,
    isCrisisMode,
    canPropose,
    canVote,
    hasDelegatedAuthority,
    getScopedPermissions,
    loading: profileLoading
  };
};
