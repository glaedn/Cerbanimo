import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../styles/theme';

export const useIntentionQuests = (intentionId, user, setUnreadCount) => {
  const { getAccessTokenSilently } = useAuth0();
  const [skills, setSkills] = useState([]);
  const [quests, setQuests] = useState([]);
  const [intention, setIntention] = useState(null);
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
      
      setSkills(Array.isArray(options.data?.skillsPool) ? options.data.skillsPool : []);
      setProfileData({
        id: profile.data.id,
        username: profile.data.username,
        skills: profile.data.skills,
      });
    } catch (error) {
      console.error('Error fetching skills and profile:', error);
    }
  };

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/p/${intentionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const questsData = res.data;
      const updated = Array.isArray(questsData) ? questsData.map(quest => ({...quest, skill_name: skills.find(s => s.id === quest.skill_id)?.name || 'Not specified'})) : [];
      setQuests(updated);
      console.log(`${theme.terminology.task_plural} data:`, updated);
      return updated;
    } catch (error) {
      console.error(`Error fetching ${theme.terminology.task_plural}:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchIntention = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/${intentionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIntention(typeof res.data === 'object' && res.data !== null && !Array.isArray(res.data) ? res.data : null);
      console.log(`${theme.terminology.project} data:`, res.data);
      return res.data;
    } catch (error) {
      console.error(`Error fetching ${theme.terminology.project}:`, error);
      throw error;
    }
  };

  const updateIntention = (updates) => {
    if (intention) {
      setIntention(prevIntention => ({ ...prevIntention, ...updates }));
    }
  };

  const handleQuestAction = async (formData, action) => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const payload = {
        userId: profileData.id,
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
  
      await fetchQuests();
      await fetchIntention();
      
      return {
        ...response.data,
        success: true
      };
    } catch (error) {
      console.error(`${theme.terminology.task} action failed:`, error.response?.data || error.message);
      return {
        error: error.response?.data?.error || `Failed to update ${theme.terminology.task}`,
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
    if (skills.length && intentionId) {
      fetchIntention();
      fetchQuests();
    }
  }, [skills.length, intentionId]);

  return {
    skills,
    quests,
    intention,
    profileData,
    loading,
    fetchQuests,
    fetchIntention,
    handleQuestAction,
    updateIntention,
  };
};