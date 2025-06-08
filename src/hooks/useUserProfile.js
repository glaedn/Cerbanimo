import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useUserProfile = () => {
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [profile, setProfile] = useState({
    id: null,
    username: '',
    experience: { total_xp: 0, current_level: 0, xp_for_next_level: 0 },
    skills: [],
    tokens: 0, // Placeholder initially, will be updated
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL, // Make sure this matches your Auth0 API audience
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token', e);
      setError(e);
      throw e; // Re-throw to stop further execution in fetchUserProfileData
    }
  };

  useEffect(() => {
    const fetchUserProfileData = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        // Optionally set an error or specific state if user is not authenticated
        // setError(new Error("User not authenticated"));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();

        // Fetch profile and skills options concurrently
        const [profileResponse, optionsResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            // Params might be needed if your backend expects sub/email for initial profile creation/retrieval
            // params: { sub: user.sub, email: user.email, name: user.name } 
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/profile/options`, {
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
        
        setProfile({
          id: profileData.id || null,
          username: profileData.username || user.name || '', // Fallback to Auth0 user name
          experience: profileData.experience || { total_xp: 0, current_level: 0, xp_for_next_level: 0 },
          skills: userSkills,
          // Check for token balance, if not found, use placeholder
          tokens: profileData.cotokens !== undefined ? profileData.cotokens : 100, // Placeholder 100 if not present
        });

      } catch (err) {
        console.error('Error fetching user profile data:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || 'Failed to fetch profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileData();
  }, [user, isAuthenticated, getAccessTokenSilently]); // Dependencies

  return { profile, loading, error };
};

export { useUserProfile };
