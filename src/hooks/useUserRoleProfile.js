import { useUserProfile } from './useUserProfile';

export function useUserRoleProfile() {
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

  return {
    isNewUser: !profile.bio && !profile.skills?.length,
    isCoordinator: profile.role === 'coordinator' || profile.is_admin,
    isContributor: profile.contributions_count > 0,
    isGovernanceActive: profile.proposals_count > 0 || profile.votes_count > 0,
    isCommunityLeader: profile.owned_communities_count > 0,
    loading: false
  };
}
