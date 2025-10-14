// hooks/useIntentionPetals.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

export const useIntentionPetals = (intentionId, user, setUnreadCount) => {
  const { getAccessTokenSilently } = useAuth0();
  const [skills, setSkills] = useState([]);
  const [petals, setPetals] = useState([]);
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

  const fetchPetals = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/petals/p/${intentionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const petalsData = res.data;
      const updated = Array.isArray(petalsData) ? petalsData.map(petal => ({...petal, skill_name: skills.find(s => s.id === petal.skill_id)?.name || 'Not specified'})) : [];
      setPetals(updated);
      console.log('Petals data:', updated);
      return updated; // Return the petals for chaining
    } catch (error) {
      console.error('Error fetching petals:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchIntention = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIntention(typeof res.data === 'object' && res.data !== null && !Array.isArray(res.data) ? res.data : null);
      console.log('Intention data:', res.data);
      return res.data; // Return intention data for chaining
    } catch (error) {
      console.error('Error fetching intention:', error);
      throw error;
    }
  };

  // New function to update intention locally
  const updateIntention = (updates) => {
    if (intention) {
      setIntention(prevIntention => ({ ...prevIntention, ...updates }));
    }
  };

  const handlePetalAction = async (formData, action) => {
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
          endpoint = `/petals/${formData.id}/accept`;
          break;
        case 'drop':
          endpoint = `/petals/${formData.id}/drop`;
          break;
        case 'submit':
          endpoint = `/petals/${formData.id}/submit`;
          break;
        case 'create':
          endpoint = `/petals/newpetal`;
          method = 'post';
          break;
        default: // update
          endpoint = `/petals/update/${formData.id}`;
      }
      const response = await axios[method](`${import.meta.env.VITE_BACKEND_URL}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Only refresh if successful
      await fetchPetals();
      await fetchIntention();
      
      return {
        ...response.data,
        success: true
      };
    } catch (error) {
      console.error('Petal action failed:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Failed to update petal',
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
      fetchPetals();
    }
  }, [skills.length, intentionId]);

  const generateManifestationSummary = async (sessionId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${sessionId}/generate-summary`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.summary;
    } catch (error) {
      console.error("Error generating manifestation summary:", error);
      return null;
    }
  };

  return {
    skills,
    petals,
    intention,
    profileData,
    loading,
    fetchPetals,
    fetchIntention,
    handlePetalAction,
    updateIntention,
    generateManifestationSummary,
  };
};