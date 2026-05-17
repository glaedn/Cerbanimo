import { useUserProfile } from "./useUserProfile";

/**
 * useUserRoleProfile
 *
 * Provides a simplified view of the user's roles and permissions
 * for the Experience Spine to determine what systems to surface.
 */
export const useUserRoleProfile = () => {
  const { profile, loading } = useUserProfile();

  if (loading || !profile) {
    return {
      isNewUser: true,
      isCoordinator: false,
      isContributor: false,
      isGovernanceActive: false,
      isCommunityLeader: false,
      loading
    };
  }

  // Determine coordinator status (example: based on high level or specific flag)
  const isCoordinator = profile.level >= 10 || profile.is_coordinator;

  // Determine if they are a contributor (they have at least some XP)
  const isContributor = profile.total_exp > 0;

  // Determine if they are a community leader
  const isCommunityLeader = profile.is_admin || profile.is_moderator;

  // Governance active if they have joined communities or have high impact
  const isGovernanceActive = profile.impact_score > 50 || profile.is_delegate;

  // A user is "new" if they haven't completed onboarding or have 0 XP
  const isNewUser = profile.total_exp === 0 && !isCoordinator;

  return {
    isNewUser,
    isCoordinator,
    isContributor,
    isGovernanceActive,
    isCommunityLeader,
    loading: false
  };
};
