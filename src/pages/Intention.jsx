// At the top of your Intention.jsx file
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField, Button } from '@mui/material';
import { useNotifications } from "./NotificationProvider.jsx"; 
import './Intention.css';
import { useIntentionPetals } from "../hooks/useIntentionPetals";
import PetalEditor from './PetalEditor.jsx'; // Assuming you have a PetalEditor component

// Updated axios interceptor to handle errors more comprehensively
axios.interceptors.response.use(
    response => response,
    error => {
        console.error('API Request Failed:', {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params,
            data: error.config?.data,
            message: error.message,
            response: error.response?.data,
        });
        return Promise.reject(error);
    }
);

const Intention = () => {
  const { intentionId } = useParams();
  const navigate = useNavigate();
  const { user, getAccessTokenSilently } = useAuth0();
  const notificationContext = useNotifications();
  const setUnreadCount = notificationContext?.setUnreadCount;
  
  // Get all state and methods from the hook
  const { 
    petals,
    skills, 
    intention,
    handlePetalAction,
    fetchPetals,
    fetchIntention,
    updateIntention
  } = useIntentionPetals(intentionId, user);

  // Keep other state that's not managed by the hook
  const [interestsPool, setInterestsPool] = useState([]);
  const [showPetalPopup, setShowPetalPopup] = useState(false);
  const [isIntentionCreator, setIsIntentionCreator] = useState(false);
  const [resonanceCount, setResonanceCount] = useState(0);
  const [hasResonated, setHasResonated] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    id: "",
  });

  const [petalForm, setPetalForm] = useState({
    id: null,
    name: '',
    description: '',
    skill_id: '',
    active_ind: false,
    status: 'inactive-unassigned',
    assigned_user_ids: [],
    dependencies: [],
    reward_tokens: 10
  });

  // Existing color palette and utility functions...
  const colorPalette = [
    blue[300], red[300], green[300], orange[300], purple[300], teal[300], pink[300], indigo[300],
    blue[400], red[400], green[400], orange[400], purple[400], teal[400], pink[400], indigo[400],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };
  

  // Centralized token retrieval method
  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email read:write:profile'
      });
    } catch (error) {
      console.error('Failed to get token:', error);
      throw error;
    }
  };

  // Consolidated data fetching methods
  const fetchSkillsAndProfile = async () => {
    try {
      const token = await getToken();
  
      // Fetch profile
      const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
        params: { sub: user.sub, email: user.email, name: user.name },
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      setProfileData({
        username: profileResponse.data.username || '',
        skills: profileResponse.data.skills || [],
        id: Number(profileResponse.data.id) || 0, // Convert to number
      });
    } catch (error) {
      console.error('Failed to fetch skills and profile:', error);
    }
  };

  // Save intention method
  const saveIntention = async () => {
    try {
      const token = await getToken();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}`, intention, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      alert('Intention saved successfully!');
    } catch (error) {
      console.error('Failed to save intention:', error);
      alert(`Failed to save intention: ${error.response?.data?.message || error.message}`);
    }
  };

  // Consolidated useEffects
  useEffect(() => {
    fetchSkillsAndProfile();
  }, [user]);

  useEffect(() => {
    if (skills.length > 0 && intentionId) {
      fetchIntention();
      fetchPetals();
    }
  }, [skills.length, intentionId]);

  useEffect(() => {
    const fetchResonanceData = async () => {
      if (!intentionId || !profileData.id) return;
      try {
        const token = await getToken();
        // Fetch resonance count
        const countRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resonances/count/${intentionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResonanceCount(countRes.data.count);

        // Check if user has resonated
        const userRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resonances/user/${profileData.id}/intention/${intentionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHasResonated(userRes.data.hasResonated);
      } catch (error) {
        console.error("Failed to fetch resonance data:", error);
      }
    };

    fetchResonanceData();
  }, [intentionId, profileData.id]);

  const handleResonate = async () => {
    if (!profileData.id) return;
    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resonances`, {
        userId: profileData.id,
        intentionId: intentionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasResonated(true);
      setResonanceCount(prev => prev + 1);
    } catch (error) {
      console.error("Failed to resonate:", error);
    }
  };

  useEffect(() => {
    if (intention && profileData.id) {
      // Convert both to numbers for comparison
      setIsIntentionCreator(Number(intention.creator_id) === Number(profileData.id));
    }
  }, [intention, profileData]);

  const handlePetalFormChange = (e) => {
    const { name, value, type, checked } = e.target;
  
    if (name === "skill") {
      const selectedSkill = skills.find(skill => String(skill.id) === String(value));
      setPetalForm(prev => ({
        ...prev,
        skill_id: selectedSkill ? selectedSkill.id : ''
      }));
    } else if (name === "reward_tokens") {
      // Ensure reward tokens is at least 5
      const tokens = Math.max(5, parseInt(value) || 5);
      setPetalForm(prev => ({
        ...prev,
        [name]: tokens
      }));
    } else {
      setPetalForm(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  // ✅ Submit Petal (Create or Update)
  const handleSubmitPetal = async () => {
    if (!petalForm.name || !petalForm.description || !petalForm.skill_id) {
      alert('All fields are required');
      return;
    }
  
    const rewardTokens = Math.max(5, parseInt(petalForm.reward_tokens) || 10);
    
    // Prepare the petal data with proper type conversion
    const petalData = {
      ...petalForm,
      reward_tokens: rewardTokens,
      intentionId: Number(intentionId), // Ensure number
      user: Number(profileData.id), // Convert to number
      skill_id: Number(petalForm.skill_id) // Convert to number if needed
    };
  
    try {
      const action = petalForm.id ? 'update' : 'create';
      await handlePetalAction(petalData, action);
  
      await fetchIntention();
      await fetchPetals();
      
      setShowPetalPopup(false);
      setPetalForm({
        id: null, 
        name: '', 
        description: '', 
        skill_id: '', 
        active_ind: true, 
        assigned_user_ids: [],
        reward_tokens: 10
      });
    } catch (error) {
      console.error('Failed to save petal:', error);
      alert(`Failed to save petal: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // Reset the form fields when switching from editing to creating a petal
  const handlePetalPopupOpen = (petal = null) => {
    if (petal) {
      // Editing a petal, populate the form with existing data
      setPetalForm(petal);
    } else {
      // Creating a new petal, clear the form
      setPetalForm({ id: null, name: '', description: '', skill_id: '', active_ind: true, assigned_user_ids: [], reward_tokens: 10 });
    }
    setShowPetalPopup(true);
  };

  useEffect(() => {
    console.log("petal form: ", petalForm);
  }, [petalForm]);


  return (
    <div className={`intention-page-container ${hasResonated ? 'resonated' : ''}`}>
      {intention && (
      <div className="intention-header">
        <h1 className="intention-title">{intention.name}</h1>
        <div className="resonance-section">
          <Typography variant="h6">{resonanceCount} Resonances</Typography>
          <Button
            variant="contained"
            onClick={handleResonate}
            disabled={hasResonated}
            sx={{
              background: 'linear-gradient(45deg, #FF00FF, #FF5CA2)',
              color: 'common.white',
              fontFamily: 'Orbitron, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '8px 15px',
              marginY: 1,
              boxShadow: hasResonated ? '0 0 20px #FF00FF' : 'none',
            }}
          >
            {hasResonated ? 'Resonated' : 'Resonate'}
          </Button>
        </div>
        <textarea
        className="intention-description"
        value={intention.description}
        onChange={(e) => isIntentionCreator && updateIntention({ description: e.target.value })}
        readOnly={!isIntentionCreator}
        />
        {isIntentionCreator && (
        <div className="token-display">
          <div><strong>Total Token Pool:</strong> {intention.token_pool || 250}</div>
          <div><strong>Tokens Allocated:</strong> {intention.reserved_tokens}</div>
          <div><strong>Tokens Spent:</strong> {intention.used_tokens || 0}</div>
          <div><strong>Tokens Available:</strong> {(intention.token_pool || 250) - (intention.used_tokens || 0) - (intention.reserved_tokens || 0)}</div>
        </div>
        )}
        <Button variant="contained" sx={{ background: 'linear-gradient(45deg, #00F3FF, #4DABF7)', color: 'common.black', fontFamily: 'Orbitron, sans-serif', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 15px', marginY: 1 }} onClick={() => navigate(`/lotus-map/${intentionId}`)}>Visualize</Button>
        {isIntentionCreator && (
        <Autocomplete
          multiple
          options={interestsPool}
          value={intention.tags || []}
          onChange={(event, newValue) => updateIntention({ tags: newValue })}
          renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Intention Tags"
            placeholder="Add tags"
          />
          )}
          renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
            return (
            <Chip
              key={key}
              label={option}
              sx={{ margin: '2px' }}
              {...otherProps}
            />
            );
          })
          }
        />
        )}
      </div>
      )}
      <div className="petals-section">
      <h2 className="petals-title">Petals</h2>
      {isIntentionCreator && <Button variant="contained" sx={{ backgroundColor: 'primary.main', color: 'common.black', fontSize: '2rem', width: '40px', height: '40px', borderRadius: '50%', minWidth: '40px', padding: 0, marginY: 1 }} onClick={() => handlePetalPopupOpen()}>+</Button>}
      <div className="petals-list">
        {petals.map((petal) => (
        <div key={petal.id} className="petal-card">
          <h3>{petal.name || 'Untitled Petal'}</h3>
          <span className={`status-indicator ${petal.active_ind ? 'active' : 'inactive'}`}>
          {petal.active_ind ? 'Active' : 'Inactive'}
          </span>
          <p>{petal.description || 'No description provided.'}</p>
          <p><strong>Skill:</strong> {petal.skill_name || 'Not specified'}</p>
          <p><strong>Reward Tokens:</strong> {petal.reward_tokens || 'None'}</p>
          {petal.submitted && isIntentionCreator && petal.active_ind && (
          <Button variant="contained" sx={{ backgroundColor: 'accentGreen.main', color: 'common.black', margin: '4px' }} onClick={() => handlePetalAction(petal.id, 'approve')}>
            Approve Work
          </Button>
          )}
          {isIntentionCreator && (
          <Button variant="contained" sx={{ backgroundColor: 'accentBlue.main', color: 'text.primary', margin: '4px' }} onClick={() => handlePetalPopupOpen(petal)}>
            Edit
          </Button>
          )}
          {petal.assigned_user_ids?.includes(parseInt(profileData.id)) && !petal.submitted && petal.active_ind && (
          <Button variant="contained" sx={{ backgroundColor: 'accentGreen.main', color: 'common.black', margin: '4px' }} onClick={() => handlePetalAction(petal.id, 'submit')}>
            Submit for Approval
          </Button>
          )}
          <Button 
            variant="contained" 
            sx={{ 
              backgroundColor: petal.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'error.main' : 'primary.main',
              color: petal.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'common.white' : 'common.black',
              margin: '4px' 
            }}
            onClick={() => handlePetalAction(
              petal.id,
              petal.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop' : 'accept'
            )}
          >
            {petal.assigned_user_ids?.includes(parseInt(profileData.id)) ? "Drop" : "Accept"}
          </Button>
          {isIntentionCreator && petal.submitted && (
          <Button variant="contained" sx={{ backgroundColor: 'secondary.main', color: 'text.primary', margin: '4px' }} onClick={() => handlePetalAction(petal.id, 'reject')}>
            Reject Work
          </Button>
          )}
        </div>
        ))}
      </div>
      </div>
      <div className="intention-controls">
      <Button variant="contained" sx={{ backgroundColor: 'primary.main', color: 'common.black', fontFamily: 'Orbitron, sans-serif', padding: '10px 10px', margin: '4px' }} onClick={saveIntention}>
        Save Intention
      </Button>
      <Button variant="contained" sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', fontFamily: 'Orbitron, sans-serif', padding: '10px 10px', margin: '4px' }} onClick={() => window.location.href = '/intentions'}>
        Intentions
      </Button>
      </div>

      <PetalEditor
  open={showPetalPopup}
  onClose={() => setShowPetalPopup(false)}
  petalForm={petalForm}
  setPetalForm={setPetalForm}
  onSubmit={handleSubmitPetal}
  skills={skills}
  isEdit={!!petalForm.id} // This should check if we're editing an existing petal
  intentionId={Number(intentionId)} // Convert to number
  currentUser={user}
  intentionCreatorId={Number(intention?.creator_id)} // Convert to number
/>
    </div>
    );
};

export default Intention;