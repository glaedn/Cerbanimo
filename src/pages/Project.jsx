import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { Chip, Autocomplete, TextField } from '@mui/material';

import './Project.css';

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
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);
  const { user, getAccessTokenSilently } = useAuth0();
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [taskForm, setTaskForm] = useState({
    id: null,
    name: '',
    description: '',
    skill_id: '', // Store skill_id directly instead of name
    active_ind: true,
    assigned_user_ids: []
});


  const colorPalette = [
    blue[100], red[100], green[100], orange[100], purple[100], teal[100], pink[100], indigo[100],
    blue[200], red[200], green[200], orange[200], purple[200], teal[200], pink[200], indigo[200],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
    profile_picture: '', // This will hold the file path or URL of the profile picture
    id: "", // Ensure the id field is part of profileData
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        console.log('Fetching skills and interests...');
        const token = await getAccessTokenSilently({
          audience: 'http://localhost:4000',
          scope: 'openid profile email read:profile write:profile',
        });

        const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setSkills(optionsResponse.data.skillsPool || []);
        setInterestsPool(optionsResponse.data.interestsPool || []);
      } catch (err) {
        console.error('Error fetching options:', err);
      }
    };

    fetchOptions();
  }, [getAccessTokenSilently]);

  const [skills, setSkills] = useState([]);
  const [isProjectCreator, setIsProjectCreator] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchSkills(); // Load skills first
      if (skills.length > 0) { // Wait until skills are available
        await fetchProject(); // Then fetch project details
        await fetchTasks();   // Fetch tasks last, ensuring skills are available
      }
    };
  
    loadData();
  }, [projectId, skills.length]);

  useEffect(() => {
    // Only calculate if both project and profileData are available
    if (project && profileData.id) {
      console.log('Project Creator ID:', project.creator_id);
      console.log('Profile ID:', profileData.id);

      // Make sure both values are strings for comparison
      setIsProjectCreator(String(project.creator_id) === String(profileData.id));
    }
}, [project, profileData]); // Dependency on both project and profileData

  const fetchProject = async () => {
    try {
      const response = await axios.get(`http://localhost:4000/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchTasks = async () => {
    try {
        const parsedProjectId = parseInt(projectId, 10);

        if (isNaN(parsedProjectId)) {
            console.error("Invalid project ID:", projectId);
            return;
        }

        const response = await axios.get(`http://localhost:4000/tasks/${parsedProjectId}`);
        const tasks = response.data;

        console.log("Fetched Tasks for Project:", tasks);

        // Assign skill names to tasks
        const updatedTasks = tasks.map(task => ({
            ...task,
            skill_name: skills.find(s => s.id === task.skill_id)?.name || 'Not specified'
        }));
         setTasks(updatedTasks);
    } catch (error) {
        console.error('Failed to fetch tasks for project:', error);
    }
};

const fetchSkills = async () => {
  try {
      const token = await getAccessTokenSilently({
          audience: 'http://localhost:4000',
          scope: 'openid profile email read:profile',
      });

      const response = await axios.get('http://localhost:4000/profile/options', {
          headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched Skills:", response.data.skillsPool); // 🔍 Debugging

      setSkills(response.data.skillsPool || []); // Now skillsPool contains { id, name }

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
      console.error('Failed to fetch skills:', error);
  }
};


 


const handleTaskFormChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (name === "skill") {
    const selectedSkill = skills.find(skill => String(skill.id) === String(value));
    setTaskForm(prev => ({
      ...prev,
      skill_id: selectedSkill ? selectedSkill.id : '' // Directly set skill_id
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
  
    console.log("Matching skill for:", taskForm.skill_id); // 🔍 Debugging
  
    // Find the skill object from the skills list
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
      title: taskForm.name, // ✅ Ensure "title" is sent
      description: taskForm.description,
      skill_id: taskForm.skill_id, // ✅ Use skill_id, not skill name
      projectId,
      active: taskForm.active_ind,
      user: profileData.id
    };
  
    console.log('Submitting Task Payload:', taskPayload); // 🔍 Debugging
  
    try {
        if (taskForm.id) {
            await axios.put(`http://localhost:4000/tasks/update/${taskForm.id}`, taskPayload);
        } else {
            await axios.post('http://localhost:4000/tasks/newtask', taskPayload);
        }
  
        setShowTaskPopup(false);
        fetchTasks();
        setTaskForm({ id: null, name: '', description: '', skill_id: '', active_ind: true, assigned_user_ids: [] });
    } catch (error) {
        console.error('Failed to save task:', error.response?.data || error.message);
    }
  };
  
  // Reset the form fields when switching from editing to creating a task
  const handleTaskPopupOpen = (task = null) => {
    if (task) {
      // Editing a task, populate the form with existing data
      setTaskForm(task);
    } else {
      // Creating a new task, clear the form
      setTaskForm({ id: null, name: '', description: '', skill_id: '', active_ind: true, assigned_user_ids: [] });
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
                      key={key}
                      label={option}
                      style={{ backgroundColor: getRandomColorFromPalette(), margin: '2px' }}
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
              <p>{task.description || 'No description provided.'}</p>
              <p><strong>Skill:</strong> {task.skill_name || 'Not specified'}</p>
              {task.submitted && isProjectCreator && (
                <button 
                  className="approve-task-button" 
                  onClick={async () => {
                    try {
                      await axios.put(`http://localhost:4000/tasks/${task.id}/approve`);
                      alert('Task approved successfully!');
                      fetchTasks();
                    } catch (error) {
                      console.error('Failed to approve task:', error);
                    }
                  }}
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
                    active_ind: task.active,
                    assigned_user_ids: task.assigned_user_ids
                  });
                  handleTaskPopupOpen(task);                   
                  setShowTaskPopup(true);
                }}>Edit</button>
              )}
              {task.assigned_user_ids?.includes(parseInt(profileData.id)) && !task.submitted && (
                <button
                  className="submit-task-button"
                  onClick={async () => {
                    try {
                          await axios.post(`http://localhost:4000/tasks/${task.id}/submit`);
                          alert('Task submitted for approval!');
                          fetchTasks(); // Refresh the task list
                        } catch (error) {
                          console.error('Failed to submit task:', error);
                        }
                    }}
                >
                  Submit for Approval
                </button>
              )}

<button
  className="accept-task-button"
  style={{
    backgroundColor: task.assigned_user_ids?.includes(parseInt(profileData.id))
      ? "rgba(237, 124, 109, 0.8)"
      : "",
  }}
  onClick={async () => {
    try {
      if (task.assigned_user_ids?.includes(parseInt(profileData.id))) {
        await axios.put(`http://localhost:4000/tasks/${task.id}/drop`, { userId: profileData.id });
        alert("Task dropped!");
      } else {
        await axios.put(`http://localhost:4000/tasks/${task.id}/accept`, { userId: profileData.id });
        alert("Task accepted!");
      }
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task assignment:", error);
    }
  }}
  disabled={!task.active_ind} // 🔹 Disable button if task is not active
>
  {task.assigned_user_ids?.includes(parseInt(profileData.id)) ? "Drop" : "Accept"}
</button>


              {/* Reject button (Project Owner can reject a submitted task) */}
              {isProjectCreator && task.submitted && (
              <button
                className="reject-task-button"
                onClick={async () => {
                  try {
                    await axios.put(`http://localhost:4000/tasks/${task.id}/reject`);
                    alert('Task rejected.');
                    fetchTasks(); // Refresh the task list
                  } catch (error) {
                    console.error('Failed to reject task:', error);
                  }
                }}
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
          onClick={async () => {
            try {
              await axios.put(`http://localhost:4000/projects/${projectId}`, project);
              alert('Project saved successfully!');
            } catch (error) {
              console.error('Failed to save project:', error);
            }
          }}
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
