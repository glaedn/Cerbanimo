// At the top of your Project.jsx file
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField, Button, Box, Typography, Paper, Grid, Accordion, AccordionSummary, AccordionDetails, LinearProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNotifications } from "./NotificationProvider.jsx"; 
import './Project.css';
import { useProjectTasks } from "../hooks/useProjectTasks";
import { useIsMobile } from '../hooks/useIsMobile';
import TaskEditor from './TaskEditor.jsx'; // Assuming you have a TaskEditor component
import ImpactGraph from '../components/HUD/ImpactGraph/ImpactGraph';

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

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const notificationContext = useNotifications();
  const setUnreadCount = notificationContext?.setUnreadCount;
  
  // Get all state and methods from the hook
  const { 
    tasks, 
    skills, 
    project, 
    handleTaskAction, 
    fetchTasks,
    fetchProject 
  } = useProjectTasks(projectId, user);

  // Keep other state that's not managed by the hook
  const [interestsPool, setInterestsPool] = useState([]);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [isProjectCreator, setIsProjectCreator] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    id: "",
  });

  const [taskForm, setTaskForm] = useState({
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

  // Save project method
  const saveProject = async () => {
    try {
      const token = await getToken();
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}`, project, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Failed to save project:', error);
      alert(`Failed to save project: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCloseProject = async () => {
    const reason = prompt("Reason for closure:");
    if (!reason) return;
    try {
      const token = await getToken();
      // Using impact_v2 or projects routes? Let's use a hypothetical unified health service route if added,
      // or just direct axios to the new backend endpoint.
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/projects/${projectId}/close`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProject();
      alert("Project closed.");
    } catch (err) {
      alert("Failed to close project.");
    }
  };

  // Consolidated useEffects
  useEffect(() => {
    fetchSkillsAndProfile();
  }, [user]);

  useEffect(() => {
    if (skills.length > 0 && projectId) {
      fetchProject();
      fetchTasks();
    }
  }, [skills.length, projectId]);

  useEffect(() => {
    if (project && profileData.id) {
      // Convert both to numbers for comparison
      setIsProjectCreator(Number(project.creator_id) === Number(profileData.id));
    }
  }, [project, profileData]);

  const handleTaskFormChange = (e) => {
    const { name, value, type, checked } = e.target;
  
    if (name === "skill") {
      const selectedSkill = skills.find(skill => String(skill.id) === String(value));
      setTaskForm(prev => ({
        ...prev,
        skill_id: selectedSkill ? selectedSkill.id : ''
      }));
    } else if (name === "reward_tokens") {
      // Ensure reward tokens is at least 5
      const tokens = Math.max(5, parseInt(value) || 5);
      setTaskForm(prev => ({
        ...prev,
        [name]: tokens
      }));
    } else {
      setTaskForm(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    }
  };

  // ✅ Submit Task (Create or Update)
  const handleSubmitTask = async () => {
    if (!taskForm.name || !taskForm.description || !taskForm.skill_id) {
      alert('All fields are required');
      return;
    }
  
    const rewardTokens = Math.max(5, parseInt(taskForm.reward_tokens) || 10);
    
    // Prepare the task data with proper type conversion
    const taskData = {
      ...taskForm,
      reward_tokens: rewardTokens,
      projectId: Number(projectId), // Ensure number
      user: Number(profileData.id), // Convert to number
      skill_id: Number(taskForm.skill_id) // Convert to number if needed
    };
  
    try {
      const action = taskForm.id ? 'update' : 'create';
      await handleTaskAction(taskData, action);
  
      await fetchProject();
      await fetchTasks();
      
      setShowTaskPopup(false);
      setTaskForm({ 
        id: null, 
        name: '', 
        description: '', 
        skill_id: '', 
        active_ind: true, 
        assigned_user_ids: [],
        reward_tokens: 10
      });
    } catch (error) {
      console.error('Failed to save task:', error);
      alert(`Failed to save task: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // Reset the form fields when switching from editing to creating a task
  const handleTaskPopupOpen = (task = null) => {
    if (task) {
      // Editing a task, populate the form with existing data
      setTaskForm(task);
    } else {
      // Creating a new task, clear the form
      setTaskForm({ id: null, name: '', description: '', skill_id: '', active_ind: true, assigned_user_ids: [], reward_tokens: 10 });
    }
    setShowTaskPopup(true);
  };

  useEffect(() => {
    console.log("task form: ", taskForm);
  }, [taskForm]); 

  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className={`project-page-container ${isMobile ? 'mobile-container' : ''}`} style={{ paddingBottom: isMobile ? '80px' : '20px' }}>
      {project && (
      <Box className="project-hud-header" sx={{ width: '90%', mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box className="cyber-panel">
              <Typography variant="h3" className="project-title-hud">{project.name.toUpperCase()}</Typography>

              <Box mt={3} display="flex" gap={2}>
                <Button
                  variant="outlined"
                  className="cyber-button-hud primary"
                  onClick={() => navigate(`/visualizer/${projectId}`)}
                >
                  SYSTEM VISUALIZER
                </Button>
                {isProjectCreator && (
                  <Button
                    variant="outlined"
                    className="cyber-button-hud secondary"
                    onClick={saveProject}
                  >
                    SYNC TO DATACORE
                  </Button>
                )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box className="cyber-panel status-panel">
              <Typography variant="overline" sx={{ color: '#00f3ff', letterSpacing: 2 }}>PROJECT VITALS</Typography>
              <Box mt={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" sx={{ color: '#888' }}>OPERATIONAL HEALTH</Typography>
                  <Typography variant="caption" sx={{ color: '#00f3ff' }}>{(project.health_score * 100 || 0).toFixed(0)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={project.health_score * 100 || 0}
                  className="hud-progress-bar"
                />
              </Box>

              <Box mt={3}>
                <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>TOKEN LEDGER</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box className="mini-metric">
                      <Typography className="metric-label">POOL</Typography>
                      <Typography className="metric-value">{project.token_pool || 250}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box className="mini-metric">
                      <Typography className="metric-label">AVAIL</Typography>
                      <Typography className="metric-value">{(project.token_pool || 250) - (project.used_tokens || 0) - (project.reserved_tokens || 0)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {isProjectCreator && project.status !== 'closed' && (
                <Button
                  fullWidth
                  variant="outlined"
                  className="cyber-button-hud danger"
                  sx={{ mt: 2 }}
                  onClick={handleCloseProject}
                >
                  TERMINATE PROJECT
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        <Box mt={3} className="cyber-panel">
          <Box display="flex" gap={4} mb={2} borderBottom="1px solid rgba(0,243,255,0.2)">
            <Button
                onClick={() => setActiveTab('summary')}
                sx={{
                    color: activeTab === 'summary' ? '#00f3ff' : '#888',
                    fontFamily: 'Orbitron',
                    borderBottom: activeTab === 'summary' ? '2px solid #00f3ff' : 'none',
                    borderRadius: 0
                }}
            >
                SUMMARY
            </Button>
            <Button
                onClick={() => setActiveTab('impact')}
                sx={{
                    color: activeTab === 'impact' ? '#ff5ca2' : '#888',
                    fontFamily: 'Orbitron',
                    borderBottom: activeTab === 'impact' ? '2px solid #ff5ca2' : 'none',
                    borderRadius: 0
                }}
            >
                IMPACT ATLAS
            </Button>
          </Box>

          {activeTab === 'summary' ? (
             <Box sx={{ color: '#eee', fontFamily: 'Inter', minHeight: '150px' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="standard"
                  value={project.description}
                  onChange={(e) => isProjectCreator && setProject({ ...project, description: e.target.value })}
                  InputProps={{
                    readOnly: !isProjectCreator,
                    disableUnderline: true,
                    style: { color: '#ccc', fontFamily: 'Inter', fontSize: '1.1rem' }
                  }}
                />
                <Box mt={2}>
                    {project.tags?.map((tag, i) => <Chip key={i} label={tag} size="small" sx={{ mr: 1, bgcolor: 'rgba(0,243,255,0.1)', color: '#00f3ff', border: '1px solid #00f3ff' }} />)}
                </Box>
             </Box>
          ) : (
            <Box sx={{ height: '300px', width: '100%' }}>
                <ImpactGraph projectId={projectId} height="100%" />
            </Box>
          )}
        </Box>
      </Box>
      )}

      <div className="tasks-section">
      <h2 className="tasks-title">OPERATIONAL TASKS</h2>
      {isProjectCreator && <button className="add-task-button" onClick={() => handleTaskPopupOpen()}>+</button>}

      {isMobile ? (
        <Box sx={{ width: '100%', mt: 2 }}>
          {tasks.map((task) => (
            <Accordion key={task.id} sx={{ bgcolor: 'rgba(28, 28, 30, 0.8)', color: '#fff', mb: 1, border: '1px solid rgba(0, 243, 255, 0.2)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#00F3FF' }} />}>
                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{task.name}</Typography>
                  <Chip
                    label={task.active_ind ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{ height: 20, fontSize: '0.6rem', bgcolor: task.active_ind ? 'success.main' : 'grey.700' }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>{task.description}</Typography>
                <Typography variant="caption" display="block">Skill: {task.skill_name}</Typography>
                <Typography variant="caption" display="block">Reward: {task.reward_tokens} coTokens</Typography>

                <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
                  {task.submitted && isProjectCreator && task.active_ind && (
                  <Button variant="outlined" size="small" sx={{ borderColor: '#00ff64', color: '#00ff64' }} onClick={() => handleTaskAction(task.id, 'approve')}>
                      APPROVE
                  </Button>
                  )}
                  {isProjectCreator && (
                  <Button variant="outlined" size="small" sx={{ borderColor: '#00f3ff', color: '#00f3ff' }} onClick={() => handleTaskPopupOpen(task)}>
                      EDIT
                  </Button>
                  )}
                  {task.assigned_user_ids?.includes(parseInt(profileData.id)) && !task.submitted && task.active_ind && (
                  <Button variant="outlined" size="small" sx={{ borderColor: '#ff5ca2', color: '#ff5ca2' }} onClick={() => handleTaskAction(task.id, 'submit')}>
                      SUBMIT
                  </Button>
                  )}
                  <Button
                      variant="outlined"
                      size="small"
                      sx={{
                          borderColor: task.assigned_user_ids?.includes(parseInt(profileData.id)) ? '#ff003c' : '#00f3ff',
                          color: task.assigned_user_ids?.includes(parseInt(profileData.id)) ? '#ff003c' : '#00f3ff',
                      }}
                      onClick={() => handleTaskAction(
                      task.id,
                      task.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop' : 'accept'
                      )}
                  >
                      {task.assigned_user_ids?.includes(parseInt(profileData.id)) ? "DROP" : "ACCEPT"}
                  </Button>
                  {isProjectCreator && task.submitted && (
                  <Button variant="outlined" size="small" sx={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={() => handleTaskAction(task.id, 'reject')}>
                      REJECT
                  </Button>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
      <div className="tasks-list">
        {tasks.map((task) => (
        <div key={task.id} className="task-card">
          <h3>{task.name || 'Untitled Task'}</h3>
          <span className={`status-indicator ${task.active_ind ? 'active' : 'inactive'}`}>
          {task.active_ind ? 'Active' : 'Inactive'}
          </span>
          <p>{task.description || 'No description provided.'}</p>
          <p><strong>Skill:</strong> {task.skill_name || 'Not specified'}</p>
          <p><strong>Reward Tokens:</strong> {task.reward_tokens || 'None'}</p>
          <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
            {task.submitted && isProjectCreator && task.active_ind && (
            <Button variant="outlined" size="small" sx={{ borderColor: '#00ff64', color: '#00ff64' }} onClick={() => handleTaskAction(task.id, 'approve')}>
                APPROVE
            </Button>
            )}
            {isProjectCreator && (
            <Button variant="outlined" size="small" sx={{ borderColor: '#00f3ff', color: '#00f3ff' }} onClick={() => handleTaskPopupOpen(task)}>
                EDIT
            </Button>
            )}
            {task.assigned_user_ids?.includes(parseInt(profileData.id)) && !task.submitted && task.active_ind && (
            <Button variant="outlined" size="small" sx={{ borderColor: '#ff5ca2', color: '#ff5ca2' }} onClick={() => handleTaskAction(task.id, 'submit')}>
                SUBMIT
            </Button>
            )}
            <Button
                variant="outlined"
                size="small"
                sx={{
                    borderColor: task.assigned_user_ids?.includes(parseInt(profileData.id)) ? '#ff003c' : '#00f3ff',
                    color: task.assigned_user_ids?.includes(parseInt(profileData.id)) ? '#ff003c' : '#00f3ff',
                }}
                onClick={() => handleTaskAction(
                task.id,
                task.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop' : 'accept'
                )}
            >
                {task.assigned_user_ids?.includes(parseInt(profileData.id)) ? "DROP" : "ACCEPT"}
            </Button>
            {isProjectCreator && task.submitted && (
            <Button variant="outlined" size="small" sx={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={() => handleTaskAction(task.id, 'reject')}>
                REJECT
            </Button>
            )}
          </Box>
        </div>
        ))}
      </div>
      )}
      </div>
      <Box className="project-controls" sx={{ height: 'auto', mt: 4, display: 'flex', gap: 2 }}>
        <Button
            variant="outlined"
            sx={{ color: '#888', borderColor: '#444', fontFamily: 'Orbitron' }}
            onClick={() => navigate('/projects')}
        >
            RETURN TO PROJECT HUB
        </Button>
      </Box>

      {showTaskPopup && (
        <TaskEditor
          open={showTaskPopup}
          onClose={() => setShowTaskPopup(false)}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          onSubmit={handleSubmitTask}
          skills={skills}
          isEdit={!!taskForm.id}
          projectId={Number(projectId)}
          currentUser={user}
          projectCreatorId={Number(project?.creator_id)}
        />
      )}
    </div>
    );
};

export default Project;