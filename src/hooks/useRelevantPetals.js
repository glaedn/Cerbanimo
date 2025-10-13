import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

// Assuming useUserProfile or similar provides the user's ID for skill filtering.
// For simplicity here, we'll fetch skills relevant to the user within this hook.
// A more optimized approach might involve a shared context for user profile data including skills.

const useRelevantPetals = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [relevantPetals, setRelevantPetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useRelevantPetals', e);
      throw e;
    }
  }, [getAccessTokenSilently]);

  const fetchRelevantPetals = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setRelevantPetals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      // Fetch all petals and user's skills (from profile/options)
      const [petalsResponse, optionsResponse, profileResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals`, { // Fetches all petals
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, { // For skills pool
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, { // To get the user's actual profile ID for skill matching
           headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const allPetals = petalsResponse.data;
      console.log('All Petals:', allPetals);
      const skillsPool = optionsResponse.data.skillsPool;
      const userProfile = profileResponse.data; // Contains user's actual ID `userProfile.id`

      let userSkills = [];
      if (userProfile.id && skillsPool && Array.isArray(skillsPool)) {
          userSkills = skillsPool
          .map(skill => {
            const userSkillInfo = skill.unlocked_users?.find(unlock => unlock.user_id === userProfile.id);
            if (userSkillInfo) {
              return {
                id: skill.id, // This is the skill_id
                name: skill.name,
                level: userSkillInfo.level,
              };
            }
            return null;
          })
          .filter(skill => skill !== null);
      }
      
      // First filter petals based on urgency and skills
      const filteredPetals = allPetals
        // Remove duplicates by petal.id first
        .filter((petal, index, self) =>
          index === self.findIndex(t => t.id === petal.id)
        )
        .filter(petal => {
          const isUrgent = petal.status && petal.status.toLowerCase().includes('urgent');
          
          let skillMatch = false;
          if (petal.skill_id && userSkills.length > 0) {
            const requiredSkill = userSkills.find(userSkill => userSkill.id === petal.skill_id);
            if (requiredSkill && (petal.skill_level === undefined || requiredSkill.level >= petal.skill_level)) {
        skillMatch = true;
            }
          }
          return isUrgent || skillMatch;
        })
        .map(petal => ({
          id: petal.id,
          name: petal.name,
          skill_name: petal.skill_name || null,
          status: petal.status || 'Unknown',
          assigned_user_ids: petal.assigned_user_ids || [],
          requiredSkillId: petal.skill_id || null,
          requiredSkillLevel: petal.skill_level === undefined ? 'Any' : petal.skill_level,
          skillMatchPercent: (petal.skill_id && userSkills.find(us => us.id === petal.skill_id)) ? 100 : 'N/A',
          timeSensitivity: petal.status && petal.status.toLowerCase().includes('urgent') ? 'High' : 'Normal',
          intention_id: petal.intention_id || null,
          intention_name: petal.intention_name || 'Unknown Intention',
        }));
      console.log('Filtered Relevant Petals:', filteredPetals);
      setRelevantPetals(filteredPetals);

    } catch (err) {
      console.error('Error fetching relevant petals:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch relevant petals');
      setRelevantPetals([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated, getToken]);

  useEffect(() => {
    fetchRelevantPetals();
  }, [fetchRelevantPetals]);

  return { relevantPetals, loading, error, refetchPetals: fetchRelevantPetals };
};

export default useRelevantPetals;
