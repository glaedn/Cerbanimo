import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useAssignedTasks = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignedTasks = async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setAssignedTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:4000',
        scope: 'openid profile email',
      });
      const response = await axios.get(`http://localhost:4000/tasks/accepted?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tasksWithPlaceholders = response.data.map(task => ({
        id: task.id,
        name: task.name,
        status: task.status || 'Unknown',
        projectName: task.project_name || 'N/A',
        projectId: task.project_id || null,
        timeRemaining: 'N/A', // Placeholder
      }));
      
      setAssignedTasks(tasksWithPlaceholders);
    } catch (err) {
      console.error('Error fetching assigned tasks:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch assigned tasks');
      setAssignedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTasks();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { assignedTasks, loading, error, refetchTasks: fetchAssignedTasks };
};

export default useAssignedTasks;
