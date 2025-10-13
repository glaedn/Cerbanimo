import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useAssignedPetals = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [assignedPetals, setAssignedPetals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignedPetals = async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setAssignedPetals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/accepted?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const petalsWithPlaceholders = response.data.map(petal => ({
        id: petal.id,
        name: petal.name,
        status: petal.status || 'Unknown',
        intentionName: petal.intention_name || 'N/A',
        intentionId: petal.intention_id || null,
        timeRemaining: 'N/A', // Placeholder
      }));
      
      setAssignedPetals(petalsWithPlaceholders);
    } catch (err) {
      console.error('Error fetching assigned petals:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch assigned petals');
      setAssignedPetals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedPetals();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { assignedPetals, loading, error, refetchPetals: fetchAssignedPetals };
};

export default useAssignedPetals;
