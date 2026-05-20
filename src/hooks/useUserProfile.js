import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useUserProfile = () => {
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetchProfileData = async () => {
    const token = await getAccessTokenSilently({
      audience: import.meta.env.VITE_BACKEND_URL,
      scope: 'openid profile email',
    });

    const [profileResponse, optionsResponse] = await Promise.all([
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ]);

    const profileData = profileResponse.data;
    const optionsData = optionsResponse.data;

    let userSkills = [];
    if (profileData.id && optionsData.skillsPool && Array.isArray(optionsData.skillsPool)) {
      userSkills = optionsData.skillsPool
        .map(skill => {
          const userSkillInfo = skill.unlocked_users?.find(unlock => unlock.user_id === profileData.id);
          if (userSkillInfo) {
            return {
              id: skill.id,
              name: skill.name,
              level: userSkillInfo.level,
              exp: userSkillInfo.exp,
            };
          }
          return null;
        })
        .filter(skill => skill !== null);
    }

    return {
      id: profileData.id || null,
      username: profileData.username || user.name || '',
      experience: profileData.experience || { total_xp: 0, current_level: 0, xp_for_next_level: 0 },
      skills: userSkills,
      tokens: profileData.cotokens !== undefined ? profileData.cotokens : 100,
      contact_links: profileData.contact_links || [],
      profile_picture: profileData.profile_picture || '',
      communities: profileData.communities || [],
      delegations: profileData.delegations || [],
      crisis_roles: profileData.crisis_roles || [],
      roleProfile: profileData.roleProfile || null,
      unlockedSystems: profileData.unlockedSystems || null,
    };
  };

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.sub],
    queryFn: fetchProfileData,
    enabled: !!isAuthenticated && !!user,
  });

  return {
    profile: profile || {
      id: null,
      username: '',
      experience: { total_xp: 0, current_level: 0, xp_for_next_level: 0 },
      skills: [],
      tokens: 0,
      contact_links: [],
      profile_picture: '',
      communities: [],
      delegations: [],
      crisis_roles: [],
      roleProfile: null,
      unlockedSystems: null,
    },
    loading: isLoading,
    error
  };
};

export { useUserProfile };
