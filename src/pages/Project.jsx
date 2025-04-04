// At the top of your Project.jsx file
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams, useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField } from '@mui/material';
import { useNotifications } from "./NotificationProvider.jsx"; 
import './Project.css';

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
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);
  const { user, getAccessTokenSilently } = useAuth0();
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [skills, setSkills] = useState([]);
  const [isProjectCreator, setIsProjectCreator] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    id: "",
  });
  
  // Safely access the notification context
  const notificationContext = useNotifications();
  // Use optional chaining to avoid the TypeError
  const setUnreadCount = notificationContext?.setUnreadCount;
  

  const [taskForm, setTaskForm] = useState({
    id: null,
    name: '',
    description: '',
    skill_id: '',
    active_ind: true,
    assigned_user_ids: [],
    reward_tokens: 10 // Add default value of 10
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

      // Fetch skills and interests
      const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSkills(optionsResponse.data.skillsPool || []);
      setInterestsPool(optionsResponse.data.interestsPool || []);

      // Fetch user profile
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
        id: profileResponse.data.id || "",
      });
    } catch (error) {
      console.error('Failed to fetch skills and profile:', error);
    }
  };

  const fetchProject = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`http://localhost:4000/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(response.data);
      console.log('Project data:', response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = await getToken();
      const parsedProjectId = parseInt(projectId, 10);

      if (isNaN(parsedProjectId)) {
        console.error("Invalid project ID:", projectId);
        return;
      }

      const response = await axios.get(`http://localhost:4000/tasks/p/${parsedProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          audience: 'http://localhost:4000',
          scope: 'openid profile email read:profile'
        }
      });

      const tasks = response.data;
      const updatedTasks = tasks.map(task => ({
        ...task,
        skill_name: skills.find(s => s.id === task.skill_id)?.name || 'Not specified'
      }));
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks for project:', error);
    }
  };
  
  // Updated task action handler with notification support
  const handleTaskAction = async (taskId, action) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      
      // Prevent submission/approval/rejection of inactive tasks
      if (!task.active_ind && ['approve', 'reject'].includes(action)) {
        alert('This task is inactive and cannot be acted upon');
        return;
      }
    
      const token = await getToken();
      console.log(taskId);
      
      // Make sure we're using the correct paths
      const actionEndpoints = {
        'submit': `/tasks/${taskId}/submit`,
        'approve': `/tasks/${taskId}/approve`,
        'reject': `/tasks/${taskId}/reject`,
        'accept': `/tasks/${taskId}/accept`,
        'drop': `/tasks/${taskId}/drop`
      };
  
      const endpoint = actionEndpoints[action];
      if (!endpoint) {
        throw new Error(`Invalid action: ${action}`);
      }
  
      const method = action === 'submit' ? 'post' : 'put';
      const payload = ['approve', 'reject', 'accept', 'drop'].includes(action)
            ? { userId: profileData.id }
            : {};
  
      // Add logging to see exactly what's being sent
      console.log(`Sending ${method.toUpperCase()} request to: ${endpoint}`, payload);
  
      const response = await axios[method](`http://localhost:4000${endpoint}`, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      console.log(`Response from ${action} action:`, response.data);
      
      // Notify users - safely increment unread count if the function exists
      if (setUnreadCount) {
        setUnreadCount((prev) => prev + 1);
      }
      
      alert(`Task ${action}ed successfully!`);
      
      // Refresh tasks and project data
      await fetchTasks();
      await fetchProject();
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      alert(`Failed to ${action} task: ${error.response?.data?.message || error.message}`);
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
      setIsProjectCreator(String(project.creator_id) === String(profileData.id));
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
  
    // Ensure reward tokens is at least 5
    const rewardTokens = Math.max(5, parseInt(taskForm.reward_tokens) || 10);
  
    // Only validate token pool for active tasks
    if (taskForm.active_ind && isProjectCreator) {
      const currentPool = project.token_pool || 250;
      const existingTask = tasks.find(t => t.id === taskForm.id);
      
      if (existingTask) {
        // For updates, calculate the difference
        const previousTokens = existingTask.active_ind ? (existingTask.reward_tokens || 0) : 0;
        const tokensToDeduct = rewardTokens - previousTokens;
        
        if (tokensToDeduct > 0 && tokensToDeduct > currentPool) {
          alert(`Not enough tokens in pool. Available: ${currentPool}, Needed: ${tokensToDeduct}`);
          return;
        }
      } else {
        // For new tasks, check full amount
        if (rewardTokens > currentPool) {
          alert(`Not enough tokens in pool. Available: ${currentPool}, Needed: ${rewardTokens}`);
          return;
        }
      }
    }
  
    const skillObj = skills.find(s => s.id === taskForm.skill_id);
  
    if (!skillObj) {
      alert(`Invalid skill selected: ${taskForm.skill_id}`);
      console.error("Skill not found. Available skills:", skills);
      return;
    }
  
    const parsedProjectId = parseInt(projectId, 10);
    if (isNaN(parsedProjectId)) {
      alert('Invalid project ID');
      return;
    }
  
    const taskPayload = {
      name: taskForm.name,
      description: taskForm.description,
      skill_id: taskForm.skill_id,
      projectId,
      active: taskForm.active_ind,
      user: profileData.id,
      reward_tokens: rewardTokens
    };
  
    try {
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:4000',
        scope: 'openid profile email write:profile'
      });
  
      if (taskForm.id) {
        await axios.put(`http://localhost:4000/tasks/update/${taskForm.id}`, taskPayload, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        await axios.post('http://localhost:4000/tasks/newtask', taskPayload, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
  
      // Notify users when a task is created or updated - safely
      if (setUnreadCount) {
        setUnreadCount((prev) => prev + 1);
      }
      
      // Refresh project data to get updated token pool
      await fetchProject();
      setShowTaskPopup(false);
      fetchTasks();
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
      console.error('Failed to save task:', error.response?.data || error.message);
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
                <button className="edit-task-button" onClick={() => { 
                  setTaskForm({
                    id: task.id,
                    name: task.name,
                    description: task.description,
                    skill_id: task.skill_id,
                    active_ind: task.active_ind,
                    assigned_user_ids: task.assigned_user_ids
                  });
                  handleTaskPopupOpen(task);                   
                  setShowTaskPopup(true);
                }}>Edit</button>
              )}
              { task.assigned_user_ids?.includes(parseInt(profileData.id)) && !task.submitted && task.active_ind && (
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


              {/* Reject button (Project Owner can reject a submitted task) */}
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
          onClick={() => saveProject()}
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

      {showTaskPopup && (
        <div className="task-popup-overlay">
          <div className="task-popup">
            <h2>{taskForm.id ? 'Edit Task' : 'Create Task'}</h2>
            <input
              type="text"
              name="name"
              placeholder="Task Name"
              value={taskForm.name}
              onChange={handleTaskFormChange}
            />
            <textarea
              name="description"
              placeholder="Task Description"
              value={taskForm.description}
              onChange={handleTaskFormChange}
            />
            <select
              name="skill"
              value={taskForm.skill_id}
              onChange={handleTaskFormChange}
            >
              <option value="">Select Skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
            <div className="reward-tokens-container">
              <label htmlFor="reward_tokens">Reward Tokens:</label>
              <input
                type="number"
                name="reward_tokens"
                min="1"
                value={taskForm.reward_tokens}
                onChange={handleTaskFormChange}
              />
            </div>
            <div className="checkbox-container">
              <input
                type="checkbox"
                name="active_ind"
                checked={taskForm.active_ind}
                onChange={handleTaskFormChange}
              />
              <label htmlFor="active">Active</label>
            </div>
            <button onClick={handleSubmitTask} className="submit-task-button">{taskForm.id ? 'Update' : 'Create'}</button>
            <button onClick={() => setShowTaskPopup(false)} className="close-popup-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;