import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';

/**
 * Hook to derive role-based permissions and profile state.
 * Used for progressive disclosure of systems.
 */
export const useUserRoleProfile = () => {
  const { profile, loading } = useUserProfile();

  const roleProfile = useMemo(() => {
    if (loading || !profile.id) {
      return {
        isNewUser: true,
        isCoordinator: false,
        isContributor: false,
        isGovernanceActive: false,
        isCommunityLeader: false,
        isAdmin: false,
        permissions: []
      };
    }

    // Role definitions based on profile data
    const isContributor = profile.experience?.total_xp > 100 || profile.skills?.length > 0;

    // Community-based roles
    const isCoordinator = profile.communities?.some(c =>
      c.role === 'coordinator' || c.role === 'admin' || c.role === 'lead'
    );

    const isCommunityLeader = profile.communities?.some(c =>
      c.role === 'founder' || c.role === 'admin'
    );

    const isGovernanceActive = profile.delegations?.length > 0 || profile.experience?.total_xp > 500;

    const isAdmin = Number(profile.id) === 15; // Known admin ID

    const isNewUser = !isContributor && profile.experience?.total_xp < 50;

    return {
      isNewUser,
      isCoordinator,
      isContributor,
      isGovernanceActive,
      isCommunityLeader,
      isAdmin,
      permissions: profile.permissions || []
    };
  }, [profile, loading]);

  return { ...roleProfile, loading };
};
