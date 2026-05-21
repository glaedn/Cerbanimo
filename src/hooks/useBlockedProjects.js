import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const useBlockedProjects = (userId) => {
  const [blockedProjects, setBlockedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchBlockedProjects = async () => {
      try {
        setLoading(true);
        // Assuming /projects endpoint exists and supports filtering or we filter client-side
        const response = await api.get('/projects');
        const projects = response.data || [];
        const blocked = projects.filter(p => p.status === 'blocked' && (p.creator_id === userId || p.coordinator_id === userId));
        setBlockedProjects(blocked);
      } catch (err) {
        console.error('Error fetching blocked projects:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedProjects();
  }, [userId]);

  return { blockedProjects, loading, error };
};

export default useBlockedProjects;
