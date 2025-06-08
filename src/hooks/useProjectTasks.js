// hooks/useProjectTasks.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

export const useProjectTasks = (projectId, user, setUnreadCount) => {
  const { getAccessTokenSilently } = useAuth0();
  const [skills, setSkills] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [profileData, setProfileData] = useState({ id: '', username: '', skills: [] });
  const [loading, setLoading] = useState(false);

  const getToken = async () => await getAccessTokenSilently({ 
    audience: import.meta.env.VITE_BACKEND_URL,
    scope: 'openid profile email'
  });

  const fetchSkillsAndProfile = async () => {
    try {
      const token = await getToken();
      const [options, profile] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
          params: { sub: user.sub, email: user.email, name: user.name },
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      setSkills(options.data.skillsPool || []);
      setProfileData({
        id: profile.data.id,
        username: profile.data.username,
        skills: profile.data.skills,
      });
    } catch (error) {
      console.error('Error fetching skills and profile:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/p/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const updated = res.data.map(task => ({
        ...task,
        skill_name: skills.find(s => s.id === task.skill_id)?.name || 'Not specified'
      }));
      
      setTasks(updated);
      console.log('Tasks data:', updated);
      return updated; // Return the tasks for chaining
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(res.data);
      console.log('Project data:', res.data);
      return res.data; // Return project data for chaining
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  };

  // New function to update project locally
  const updateProject = (updates) => {
    if (project) {
      setProject(prevProject => ({ ...prevProject, ...updates }));
    }
  };

  const handleTaskAction = async (formData, action) => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Simplify the payload - only send what's needed
      const payload = {
        userId: profileData.id, // Only include user ID for accept/drop
        ...(action === 'accept' || action === 'drop' ? {} : formData)
      };
  
      let endpoint;
      let method = 'put';
      
      switch(action) {
        case 'accept':
          endpoint = `/tasks/${formData.id}/accept`;
          break;
        case 'drop':
          endpoint = `/tasks/${formData.id}/drop`;
          break;
        case 'submit':
          endpoint = `/tasks/${formData.id}/submit`;
          break;
        case 'create':
          endpoint = `/tasks/newtask`;
          method = 'post';
          break;
        default: // update
          endpoint = `/tasks/update/${formData.id}`;
      }
      const response = await axios[method](`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Only refresh if successful
      await fetchTasks();
      await fetchProject();
      
      return {
        ...response.data,
        success: true
      };
    } catch (error) {
      console.error('Task action failed:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Failed to update task',
        success: false
      };
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    if (user) fetchSkillsAndProfile();
  }, [user]);

  useEffect(() => {
    if (skills.length && projectId) {
      fetchProject();
      fetchTasks();
    }
  }, [skills.length, projectId]);

  return {
    skills,
    tasks,
    project,
    profileData,
    loading,
    fetchTasks,
    fetchProject,
    handleTaskAction,
    updateProject, // Export the new function
  };
};