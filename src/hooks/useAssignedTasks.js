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
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tasksWithPlaceholders = response.data.map(task => ({
        id: task.id,
        name: task.name,
        status: task.status || 'Unknown',
        project_name: task.project_name || 'N/A',
        project_id: task.project_id || null,
        reward_tokens: task.reward_tokens || 0,
        due_date: task.due_date || null,
        deadline: task.due_date || null,
        skill_name: task.skill_name || null,
        skill_level: task.skill_level || 0,
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
