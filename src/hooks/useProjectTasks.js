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

  const getToken = async () => await getAccessTokenSilently({ audience: 'http://localhost:4000' });

  const fetchSkillsAndProfile = async () => {
    const token = await getToken();
    const options = await axios.get('http://localhost:4000/profile/options', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSkills(options.data.skillsPool || []);
    const profile = await axios.get('http://localhost:4000/profile', {
      params: { sub: user.sub, email: user.email, name: user.name },
      headers: { Authorization: `Bearer ${token}` },
    });
    setProfileData({
      id: profile.data.id,
      username: profile.data.username,
      skills: profile.data.skills,
    });
  };

  const fetchTasks = async () => {
    const token = await getToken();
    const res = await axios.get(`http://localhost:4000/tasks/p/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updated = res.data.map(task => ({
      ...task,
      skill_name: skills.find(s => s.id === task.skill_id)?.name || 'Not specified'
    }));
    setTasks(updated);
  };

  const fetchProject = async () => {
    const token = await getToken();
    const res = await axios.get(`http://localhost:4000/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setProject(res.data);
  };

  const handleTaskAction = async (taskId, action) => {
    const token = await getToken();
    const payload = ['approve', 'reject', 'accept', 'drop'].includes(action)
      ? { userId: profileData.id }
      : {};
    const endpointMap = {
      submit: `/tasks/${taskId}/submit`,
      approve: `/tasks/${taskId}/approve`,
      reject: `/tasks/${taskId}/reject`,
      accept: `/tasks/${taskId}/accept`,
      drop: `/tasks/${taskId}/drop`,
    };
    await axios[action === 'submit' ? 'post' : 'put'](`http://localhost:4000${endpointMap[action]}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (setUnreadCount) setUnreadCount(prev => prev + 1);
    await fetchTasks();
    await fetchProject();
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
    fetchTasks,
    fetchProject,
    handleTaskAction,
  };
};
