import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useUserProjects = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: 'http://localhost:4000',
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useUserProjects', e);
      throw e; 
    }
  };

  useEffect(() => {
    const fetchProjectsAndTasks = async () => {
      if (!userId || !isAuthenticated) {
        setLoading(false);
        // Set projects to empty array if userId is not available yet, or not authenticated
        setProjects([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        
        // Fetch user's projects
        // Assuming the endpoint returns projects where user is creator_id or explicitly managed
        const projectResponse = await axios.get(`http://localhost:4000/projects/userprojects?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let fetchedProjects = projectResponse.data;
        if (!Array.isArray(fetchedProjects)) {
            // If the endpoint doesn't directly return an array of projects managed by the user,
            // and instead returns all projects for potential client-side filtering (less ideal).
            // This example assumes /userprojects is specific. If not, adjust filtering here.
            // For example, if it returned all projects:
            // fetchedProjects = projectResponse.data.filter(p => p.creator_id === userId);
            console.warn("Fetched projects is not an array. Ensure endpoint returns correctly filtered projects or adjust hook.");
            fetchedProjects = []; // Or handle as error
        }


        const projectsWithTaskData = await Promise.all(
          fetchedProjects.map(async (proj) => {
            try {
              const tasksResponse = await axios.get(`http://localhost:4000/tasks/p/${proj.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const tasks = tasksResponse.data;
              const taskCount = tasks.length;
              const completedTasks = tasks.filter(t => t.status && (t.status.toLowerCase() === 'completed' || t.status.toLowerCase() === 'archived')).length;
              const activeTasks = taskCount - completedTasks;
              const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

              return {
                id: proj.id,
                name: proj.name,
                description: proj.description || '',
                taskCount,
                activeTasks,
                completedTasks,
                progress,
                token_pool: proj.token_pool || 0,
              };
            } catch (taskError) {
              console.error(`Error fetching tasks for project ${proj.id}:`, taskError);
              // Return project with partial data or mark as error for this project
              return {
                id: proj.id,
                name: proj.name,
                description: proj.description || '',
                taskCount: 0, activeTasks: 0, completedTasks: 0, progress: 0, xpGained: 'N/A', errorFetchingTasks: true
              };
            }
          })
        );
        setProjects(projectsWithTaskData);
      } catch (err) {
        console.error('Error fetching user projects:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || 'Failed to fetch projects');
        setProjects([]); // Clear projects on error
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsAndTasks();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { projects, loading, error };
};

export default useUserProjects;
