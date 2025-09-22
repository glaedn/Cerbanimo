import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useAssignedQuests = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [assignedQuests, setAssignedQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignedQuests = async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setAssignedQuests([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const questsWithPlaceholders = response.data.map(quest => ({
        id: quest.id,
        name: quest.name,
        status: quest.status || 'Unknown',
        projectName: quest.project_name || 'N/A',
        projectId: quest.project_id || null,
        timeRemaining: 'N/A', // Placeholder
      }));
      
      setAssignedQuests(questsWithPlaceholders);
    } catch (err) {
      console.error('Error fetching assigned quests:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch assigned quests');
      setAssignedQuests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedQuests();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { assignedQuests, loading, error, refetchQuests: fetchAssignedQuests };
};

export default useAssignedQuests;
