import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

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
    const fetchIntentionsAndPetals = async () => {
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
        const intentionResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/userintentions?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let fetchedIntentions = intentionResponse.data;
        if (!Array.isArray(fetchedIntentions)) {
            // If the endpoint doesn't directly return an array of intentions managed by the user,
            // and instead returns all intentions for potential client-side filtering (less ideal).
            // This example assumes /userintentions is specific. If not, adjust filtering here.
            // For example, if it returned all intentions:
            // fetchedIntentions = intentionResponse.data.filter(p => p.creator_id === userId);
            console.warn("Fetched intentions is not an array. Ensure endpoint returns correctly filtered intentions or adjust hook.");
            fetchedIntentions = []; // Or handle as error
        }


        const intentionsWithPetalData = await Promise.all(
          fetchedIntentions.map(async (proj) => {
            try {
              const petalsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/p/${proj.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const petals = petalsResponse.data;
              const petalCount = petals.length;
              const completedPetals = petals.filter(t => t.status && (t.status.toLowerCase() === 'completed' || t.status.toLowerCase() === 'archived')).length;
                const inactivePetals = petals.filter(t => t.status && (t.status.toLowerCase() === 'inactive-assigned' || t.status.toLowerCase() === 'inactive-unassigned')).length;
                const activePetals = petalCount - completedPetals - inactivePetals;
              const progress = petalCount > 0 ? Math.round((completedPetals / petalCount) * 100) : 0;

              return {
                id: proj.id,
                name: proj.name,
                description: proj.description || '',
                petalCount,
                activePetals,
                completedPetals,
                progress,
                token_pool: proj.token_pool || 0,
              };
            } catch (petalError) {
              console.error(`Error fetching petals for intention ${proj.id}:`, petalError);
              // Return intention with partial data or mark as error for this intention
              return {
                id: proj.id,
                name: proj.name,
                description: proj.description || '',
                petalCount: 0, activePetals: 0, completedPetals: 0, progress: 0, xpGained: 'N/A', errorFetchingPetals: true
              };
            }
          })
        );
        setIntentions(intentionsWithPetalData);
      } catch (err) {
        console.error('Error fetching user intentions:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || 'Failed to fetch intentions');
        setIntentions([]); // Clear intentions on error
      } finally {
        setLoading(false);
      }
    };

    fetchIntentionsAndPetals();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { intentions, loading, error };
};

export default useUserIntentions;