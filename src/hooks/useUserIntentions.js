import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../styles/theme';

const useUserIntentions = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [intentions, setIntentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useUserIntentions', e);
      throw e;
    }
  };

  useEffect(() => {
    const fetchIntentionsAndQuests = async () => {
      if (!userId || !isAuthenticated) {
        setLoading(false);
        // Set intentions to empty array if userId is not available yet, or not authenticated
        setIntentions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();

        // Fetch user's intentions
        // Assuming the endpoint returns intentions where user is creator_id or explicitly managed
        const intentionResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/userprojects?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let fetchedIntentions = intentionResponse.data;
        if (!Array.isArray(fetchedIntentions)) {
            // If the endpoint doesn't directly return an array of intentions managed by the user,
            // and instead returns all intentions for potential client-side filtering (less ideal).
            // This example assumes /userprojects is specific. If not, adjust filtering here.
            // For example, if it returned all intentions:
            // fetchedIntentions = projectResponse.data.filter(p => p.creator_id === userId);
            console.warn("Fetched intentions is not an array. Ensure endpoint returns correctly filtered intentions or adjust hook.");
            fetchedIntentions = []; // Or handle as error
        }


        const intentionsWithQuestData = await Promise.all(
          fetchedIntentions.map(async (intention) => {
            try {
              const questsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/p/${intention.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const quests = questsResponse.data;
              const questCount = quests.length;
              const completedQuests = quests.filter(t => t.status && (t.status.toLowerCase() === 'completed' || t.status.toLowerCase() === 'archived')).length;
                const inactiveQuests = quests.filter(t => t.status && (t.status.toLowerCase() === 'inactive-assigned' || t.status.toLowerCase() === 'inactive-unassigned')).length;
                const activeQuests = questCount - completedQuests - inactiveQuests;
              const progress = questCount > 0 ? Math.round((completedQuests / questCount) * 100) : 0;

              return {
                id: intention.id,
                name: intention.name,
                description: intention.description || '',
                questCount,
                activeQuests,
                completedQuests,
                progress,
                token_pool: intention.token_pool || 0,
              };
            } catch (questError) {
              console.error(`Error fetching quests for intention ${intention.id}:`, questError);
              // Return intention with partial data or mark as error for this intention
              return {
                id: intention.id,
                name: intention.name,
                description: intention.description || '',
                questCount: 0, activeQuests: 0, completedQuests: 0, progress: 0, xpGained: 'N/A', errorFetchingQuests: true
              };
            }
          })
        );
        setIntentions(intentionsWithQuestData);
      } catch (err) {
        console.error('Error fetching user intentions:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || `Failed to fetch ${theme.terminology.project_plural}`);
        setIntentions([]); // Clear intentions on error
      } finally {
        setLoading(false);
      }
    };

    fetchIntentionsAndQuests();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { intentions, loading, error };
};

export default useUserIntentions;
