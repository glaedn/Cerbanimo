import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField, Button } from '@mui/material';
import { useNotifications } from "./NotificationProvider.jsx";
import './Intention.css';
import { useIntentionQuests } from "../hooks/useIntentionQuests";
import QuestEditor from './QuestEditor.jsx';
import theme from '../styles/theme';

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
  
  const { 
    quests,
    skills, 
    intention,
    handleQuestAction,
    fetchQuests,
    fetchIntention
  } = useIntentionQuests(intentionId, user);

  const [interestsPool, setInterestsPool] = useState([]);
  const [showQuestPopup, setShowQuestPopup] = useState(false);
  const [isIntentionCreator, setIsIntentionCreator] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    id: "",
  });

  const [questForm, setQuestForm] = useState({
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

  const colorPalette = [
    blue[300], red[300], green[300], orange[300], purple[300], teal[300], pink[300], indigo[300],
    blue[400], red[400], green[400], orange[400], purple[400], teal[400], pink[400], indigo[400],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };
  

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

  const fetchSkillsAndProfile = async () => {
    try {
      const token = await getToken();
  
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
        id: Number(profileResponse.data.id) || 0,
      });
    } catch (error) {
      console.error('Failed to fetch skills and profile:', error);
    }
  };

  const saveIntention = async () => {
    try {
      const token = await getToken();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/projects/${intentionId}`, intention, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      alert(`${theme.terminology.intention} saved successfully!`);
    } catch (error) {
      console.error(`Failed to save ${theme.terminology.intention}:`, error);
      alert(`Failed to save ${theme.terminology.intention}: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    fetchSkillsAndProfile();
  }, [user]);

  useEffect(() => {
    if (skills.length > 0 && intentionId) {
      fetchIntention();
      fetchQuests();
    }
  }, [skills.length, intentionId]);

  useEffect(() => {
    if (intention && profileData.id) {
      setIsIntentionCreator(Number(intention.creator_id) === Number(profileData.id));
    }
  }, [intention, profileData]);

  const handleQuestFormChange = (e) => {
    const { name, value, type, checked } = e.target;
  
    if (name === "skill") {
      const selectedSkill = skills.find(skill => String(skill.id) === String(value));
      setQuestForm(prev => ({
        ...prev,
        skill_id: selectedSkill ? selectedSkill.id : ''
      }));
    } else if (name === "reward_tokens") {
      const tokens = Math.max(5, parseInt(value) || 5);
      setQuestForm(prev => ({
        ...prev,
        [name]: tokens
      }));
    } else {
      setQuestForm(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  const handleSubmitQuest = async () => {
    if (!questForm.name || !questForm.description || !questForm.skill_id) {
      alert('All fields are required');
      return;
    }
  
    const rewardTokens = Math.max(5, parseInt(questForm.reward_tokens) || 10);
    
    const questData = {
      ...questForm,
      reward_tokens: rewardTokens,
      intentionId: Number(intentionId),
      user: Number(profileData.id),
      skill_id: Number(questForm.skill_id)
    };
  
    try {
      const action = questForm.id ? 'update' : 'create';
      await handleQuestAction(questData, action);
  
      await fetchIntention();
      await fetchQuests();
      
      setShowQuestPopup(false);
      setQuestForm({
        id: null, 
        name: '', 
        description: '', 
        skill_id: '', 
        active_ind: true, 
        assigned_user_ids: [],
        reward_tokens: 10
      });
    } catch (error) {
      console.error(`Failed to save ${theme.terminology.task}:`, error);
      alert(`Failed to save ${theme.terminology.task}: ${error.response?.data?.message || error.message}`);
    }
  };
  
  const handleQuestPopupOpen = (quest = null) => {
    if (quest) {
      setQuestForm(quest);
    } else {
      setQuestForm({ id: null, name: '', description: '', skill_id: '', active_ind: true, assigned_user_ids: [], reward_tokens: 10 });
    }
    setShowQuestPopup(true);
  };

  useEffect(() => {
    console.log("quest form: ", questForm);
  }, [questForm]);


  return (
    <div className="project-page-container">
      {intention && (
      <div className="project-header">
        <h1 className="project-title">{intention.name}</h1>
        <textarea
        className="project-description"
        value={intention.description}
        onChange={(e) => isIntentionCreator && setIntention({ ...intention, description: e.target.value })}
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
        <Button variant="contained" sx={{ background: 'linear-gradient(45deg, #00F3FF, #4DABF7)', color: 'common.black', fontFamily: 'Orbitron, sans-serif', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 15px', marginY: 1 }} onClick={() => navigate(`/visualizer/${intentionId}`)}>Visualize</Button>
        {isIntentionCreator && (
        <Autocomplete
          multiple
          options={interestsPool}
          value={intention.tags || []}
          onChange={(event, newValue) => setIntention({ ...intention, tags: newValue })}
          renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label={`${theme.terminology.intention} Tags`}
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
      <div className="tasks-section">
      <h2 className="tasks-title">{theme.terminology.task_plural}</h2>
      {isIntentionCreator && <Button variant="contained" sx={{ backgroundColor: 'primary.main', color: 'common.black', fontSize: '2rem', width: '40px', height: '40px', borderRadius: '50%', minWidth: '40px', padding: 0, marginY: 1 }} onClick={() => handleQuestPopupOpen()}>+</Button>}
      <div className="tasks-list">
        {quests.map((quest) => (
        <div key={quest.id} className="task-card">
          <h3>{quest.name || `Untitled ${theme.terminology.task}`}</h3>
          <span className={`status-indicator ${quest.active_ind ? 'active' : 'inactive'}`}>
          {quest.active_ind ? 'Active' : 'Inactive'}
          </span>
          <p>{quest.description || 'No description provided.'}</p>
          <p><strong>{theme.terminology.skill}:</strong> {quest.skill_name || 'Not specified'}</p>
          <p><strong>Reward Tokens:</strong> {quest.reward_tokens || 'None'}</p>
          {quest.submitted && isIntentionCreator && quest.active_ind && (
          <Button variant="contained" sx={{ backgroundColor: 'accentGreen.main', color: 'common.black', margin: '4px' }} onClick={() => handleQuestAction(quest.id, 'approve')}>
            Approve Work
          </Button>
          )}
          {isIntentionCreator && (
          <Button variant="contained" sx={{ backgroundColor: 'accentBlue.main', color: 'text.primary', margin: '4px' }} onClick={() => handleQuestPopupOpen(quest)}>
            Edit
          </Button>
          )}
          {quest.assigned_user_ids?.includes(parseInt(profileData.id)) && !quest.submitted && quest.active_ind && (
          <Button variant="contained" sx={{ backgroundColor: 'accentGreen.main', color: 'common.black', margin: '4px' }} onClick={() => handleQuestAction(quest.id, 'submit')}>
            Submit for Approval
          </Button>
          )}
          <Button 
            variant="contained" 
            sx={{ 
              backgroundColor: quest.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'error.main' : 'primary.main',
              color: quest.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'common.white' : 'common.black',
              margin: '4px' 
            }}
            onClick={() => handleQuestAction(
              quest.id,
              quest.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop' : 'accept'
            )}
          >
            {quest.assigned_user_ids?.includes(parseInt(profileData.id)) ? "Drop" : "Accept"}
          </Button>
          {isIntentionCreator && quest.submitted && (
          <Button variant="contained" sx={{ backgroundColor: 'secondary.main', color: 'text.primary', margin: '4px' }} onClick={() => handleQuestAction(quest.id, 'reject')}>
            Reject Work
          </Button>
          )}
        </div>
        ))}
      </div>
      </div>
      <div className="project-controls">
      <Button variant="contained" sx={{ backgroundColor: 'primary.main', color: 'common.black', fontFamily: 'Orbitron, sans-serif', padding: '10px 10px', margin: '4px' }} onClick={saveIntention}>
        Save {theme.terminology.intention}
      </Button>
      <Button variant="contained" sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', fontFamily: 'Orbitron, sans-serif', padding: '10px 10px', margin: '4px' }} onClick={() => window.location.href = '/intentions'}>
        {theme.terminology.intention_plural}
      </Button>
      </div>

      <QuestEditor
  open={showQuestPopup}
  onClose={() => setShowQuestPopup(false)}
  questForm={questForm}
  setQuestForm={setQuestForm}
  onSubmit={handleSubmitQuest}
  skills={skills}
  isEdit={!!questForm.id}
  intentionId={Number(intentionId)}
  currentUser={user}
  projectCreatorId={Number(intention?.creator_id)}
/>
    </div>
    );
};

export default Intention;