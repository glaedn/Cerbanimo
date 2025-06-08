import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

// Assuming useUserProfile or similar provides the user's ID for skill filtering.
// For simplicity here, we'll fetch skills relevant to the user within this hook.
// A more optimized approach might involve a shared context for user profile data including skills.

const useRelevantTasks = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [relevantTasks, setRelevantTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useRelevantTasks', e);
      throw e;
    }
  }, [getAccessTokenSilently]);

  const fetchRelevantTasks = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setLoading(false);
      setRelevantTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      // Fetch all tasks and user's skills (from profile/options)
      const [tasksResponse, optionsResponse, profileResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/tasks`, { // Fetches all tasks
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/profile/options`, { // For skills pool
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, { // To get the user's actual profile ID for skill matching
           headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const allTasks = tasksResponse.data;
      console.log('All Tasks:', allTasks);
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
      
      // First filter tasks based on urgency and skills
      const filteredTasks = allTasks
        // Remove duplicates by task.id first
        .filter((task, index, self) => 
          index === self.findIndex(t => t.id === task.id)
        )
        .filter(task => {
          const isUrgent = task.status && task.status.toLowerCase().includes('urgent');
          
          let skillMatch = false;
          if (task.skill_id && userSkills.length > 0) {
            const requiredSkill = userSkills.find(userSkill => userSkill.id === task.skill_id);
            if (requiredSkill && (task.skill_level === undefined || requiredSkill.level >= task.skill_level)) {
        skillMatch = true;
            }
          }
          return isUrgent || skillMatch;
        })
        .map(task => ({
          id: task.id,
          name: task.name,
          skill_name: task.skill_name || null,
          status: task.status || 'Unknown',
          assigned_user_ids: task.assigned_user_ids || [],
          requiredSkillId: task.skill_id || null,
          requiredSkillLevel: task.skill_level === undefined ? 'Any' : task.skill_level,
          skillMatchPercent: (task.skill_id && userSkills.find(us => us.id === task.skill_id)) ? 100 : 'N/A',
          timeSensitivity: task.status && task.status.toLowerCase().includes('urgent') ? 'High' : 'Normal',
          project_id: task.project_id || null,
          project_name: task.project_name || 'Unknown Project',
        }));
      console.log('Filtered Relevant Tasks:', filteredTasks);
      setRelevantTasks(filteredTasks);

    } catch (err) {
      console.error('Error fetching relevant tasks:', err.response?.data || err.message);
      setError(err.response?.data?.error || err.message || 'Failed to fetch relevant tasks');
      setRelevantTasks([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated, getToken]);

  useEffect(() => {
    fetchRelevantTasks();
  }, [fetchRelevantTasks]);

  return { relevantTasks, loading, error, refetchTasks: fetchRelevantTasks };
};

export default useRelevantTasks;
