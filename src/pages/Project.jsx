// At the top of your Project.jsx file
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField } from '@mui/material';
import { useNotifications } from "./NotificationProvider.jsx"; 
import './Project.css';
import { useProjectTasks } from "../hooks/useProjectTasks";
import TaskEditor from './TaskEditor.jsx'; // Assuming you have a TaskEditor component

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
        audience: 'http://localhost:4000',
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
      const profileResponse = await axios.get('http://localhost:4000/profile', {
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
      await axios.put(`http://localhost:4000/projects/${projectId}`, project, {
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


  return (
    <div className="project-page-container">
      {project && (
      <div className="project-header">
        <h1 className="project-title">{project.name}</h1>
        <textarea
        className="project-description"
        value={project.description}
        onChange={(e) => isProjectCreator && setProject({ ...project, description: e.target.value })}
        readOnly={!isProjectCreator}
        />
        {isProjectCreator && (
        <div className="token-display">
          <div><strong>Total Token Pool:</strong> {project.token_pool || 250}</div>
          <div><strong>Tokens Allocated:</strong> {project.reserved_tokens}</div>
          <div><strong>Tokens Spent:</strong> {project.used_tokens || 0}</div>
          <div><strong>Tokens Available:</strong> {(project.token_pool || 250) - (project.used_tokens || 0) - (project.reserved_tokens || 0)}</div>
        </div>
        )}
        <button className="visualize-button" onClick={() => navigate(`/visualizer/${projectId}`)}>Visualize</button>
        {isProjectCreator && (
        <Autocomplete
          className="profile-textfield profile-field"
          multiple
          options={interestsPool}
          value={project.tags || []}
          onChange={(event, newValue) => setProject({ ...project, tags: newValue })}
          renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Project Tags"
            placeholder="Add tags"
          />
          )}
          renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
            return (
            <Chip
              className="tags"
              key={key}
              label={option}
              style={{ backgroundColor: getRandomColorFromPalette(), margin: '2px', color: 'white' }}
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
      <h2 className="tasks-title">Tasks</h2>
      {isProjectCreator && <button className="add-task-button" onClick={() => handleTaskPopupOpen()}>+</button>}
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
          {task.submitted && isProjectCreator && task.active_ind && (
          <button 
            className="approve-task-button" 
            onClick={() => handleTaskAction(task.id, 'approve')}
          >
            Approve Work
          </button>
          )}
          {isProjectCreator && (
          <button className="edit-task-button" onClick={() => handleTaskPopupOpen(task)}>
            Edit
          </button>
          )}
          {task.assigned_user_ids?.includes(parseInt(profileData.id)) && !task.submitted && task.active_ind && (
          <button
            className="submit-task-button"
            onClick={() => handleTaskAction(task.id, 'submit')}
          >
            Submit for Approval
          </button>
          )}
          <button 
          className={`accept-task-button ${task.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop-task-button' : ''}`}
          onClick={() => handleTaskAction(
            task.id, 
            task.assigned_user_ids?.includes(parseInt(profileData.id)) ? 'drop' : 'accept'
          )}
          >
          {task.assigned_user_ids?.includes(parseInt(profileData.id)) ? "Drop" : "Accept"}
          </button>
          {isProjectCreator && task.submitted && (
          <button 
            className="reject-task-button"
            onClick={() => handleTaskAction(task.id, 'reject')}
          >
            Reject Work
          </button>
          )}
        </div>
        ))}
      </div>
      </div>
      <div className="project-controls">
      <button 
        className="save-project-button" 
        onClick={saveProject}
      >
        Save Project
      </button>
      <button 
        className="back-to-projects-button" 
        onClick={() => window.location.href = '/projects'}
      >
        Projects
      </button>
      </div>

      <TaskEditor
  open={showTaskPopup}
  onClose={() => setShowTaskPopup(false)}
  taskForm={taskForm}
  setTaskForm={setTaskForm}
  onSubmit={handleSubmitTask}
  skills={skills}
  isEdit={!!taskForm.id} // This should check if we're editing an existing task
  projectId={Number(projectId)} // Convert to number
  currentUser={user}
  projectCreatorId={Number(project?.creator_id)} // Convert to number
/>
    </div>
    );
};

export default Project;