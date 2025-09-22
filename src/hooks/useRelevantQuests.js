import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

// Assuming useUserProfile or similar provides the user's ID for skill filtering.
// For simplicity here, we'll fetch skills relevant to the user within this hook.
// A more optimized approach might involve a shared context for user profile data including skills.

const useRelevantQuests = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [relevantQuests, setRelevantQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useRelevantQuests', e);
      throw e;
    }
  }, [getAccessTokenSilently]);

  const fetchRelevantQuests = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setRelevantQuests([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      // Fetch all quests and user's affinities (from profile/options)
      const [questsResponse, optionsResponse, profileResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks`, { // Fetches all quests
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, { // For affinities pool
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, { // To get the user's actual profile ID for affinity matching
           headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const allQuests = questsResponse.data;
      console.log('All Quests:', allQuests);
      const affinitiesPool = optionsResponse.data.skillsPool;
      const userProfile = profileResponse.data; // Contains user's actual ID `userProfile.id`

      let userAffinities = [];
      if (userProfile.id && affinitiesPool && Array.isArray(affinitiesPool)) {
          userAffinities = affinitiesPool
          .map(affinity => {
            const userAffinityInfo = affinity.unlocked_users?.find(unlock => unlock.user_id === userProfile.id);
            if (userAffinityInfo) {
              return {
                id: affinity.id, // This is the affinity_id
                name: affinity.name,
                level: userAffinityInfo.level,
              };
            }
            return null;
          })
          .filter(affinity => affinity !== null);
      }

      // First filter quests based on urgency and affinities
      const filteredQuests = allQuests
        // Remove duplicates by quest.id first
        .filter((quest, index, self) =>
          index === self.findIndex(t => t.id === quest.id)
        )
        .filter(quest => {
          const isUrgent = quest.status && quest.status.toLowerCase().includes('urgent');

          let affinityMatch = false;
          if (quest.skill_id && userAffinities.length > 0) {
            const requiredAffinity = userAffinities.find(userAffinity => userAffinity.id === quest.skill_id);
            if (requiredAffinity && (quest.skill_level === undefined || requiredAffinity.level >= quest.skill_level)) {
        affinityMatch = true;
            }
          }
          return isUrgent || affinityMatch;
        })
        .map(quest => ({
          id: quest.id,
          name: quest.name,
          skill_name: quest.skill_name || null,
          status: quest.status || 'Unknown',
          assigned_user_ids: quest.assigned_user_ids || [],
          requiredAffinityId: quest.skill_id || null,
          requiredAffinityLevel: quest.skill_level === undefined ? 'Any' : quest.skill_level,
          affinityMatchPercent: (quest.skill_id && userAffinities.find(us => us.id === quest.skill_id)) ? 100 : 'N/A',
          timeSensitivity: quest.status && quest.status.toLowerCase().includes('urgent') ? 'High' : 'Normal',
          project_id: quest.project_id || null,
          project_name: quest.project_name || 'Unknown Project',
        }));
      console.log('Filtered Relevant Quests:', filteredQuests);
      setRelevantQuests(filteredQuests);

    } catch (err) {
      console.error('Error fetching relevant quests:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch relevant quests');
      setRelevantQuests([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated, getToken]);

  useEffect(() => {
    fetchRelevantQuests();
  }, [fetchRelevantQuests]);

  return { relevantQuests, loading, error, refetchQuests: fetchRelevantQuests };
};

export default useRelevantQuests;
