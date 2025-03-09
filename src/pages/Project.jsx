import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useParams } from 'react-router-dom';

import './Project.css';

async function printGridFromGoogleDoc(url) {
    try {
        // Fetch the content of the Google Doc
        const response = await fetch(url);
        const text = await response.text();

        // Parse the content to extract characters and their coordinates
        const lines = text.split('\n');
        const gridData = [];
        let maxX = 0;
        let maxY = 0;

        lines.forEach(line => {
            const match = line.match(/(\d+)\s+(.)\s+(\d+)/);
            if (match) {
                const x = parseInt(match[1], 10);
                const char = match[2];
                const y = parseInt(match[3], 10);
                gridData.push({ char, x, y });
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        });

        // Initialize the grid with spaces
        const grid = Array.from({ length: maxY + 1 }, () => Array.from({ length: maxX + 1 }, () => ' '));

        // Populate the grid with characters
        gridData.forEach(({ char, x, y }) => {
            grid[y][x] = char;
        });

        // Print the grid
        grid.forEach(row => {
            console.log(row.join(''));
        });

    } catch (error) {
        console.error('Error fetching or parsing the Google Doc:', error);
    }
}

// Example usage
const googleDocUrl = 'https://docs.google.com/document/d/e/2PACX-1vRMx5YQlZNa3ra8dYYxmv-QIQ3YJe8tbI3kqcuC7lQiZm-CSEznKfN_HYNSpoXcZIV3Y_O3YoUB1ecq/pub';
printGridFromGoogleDoc(googleDocUrl);

const Project = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const { user, getAccessTokenSilently } = useAuth0();
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [taskForm, setTaskForm] = useState({
    id: null,
    title: '',
    description: '',
    skill: '',
    active: true,
  });

  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
    profile_picture: '', // This will hold the file path or URL of the profile picture
    id: "", // Ensure the id field is part of profileData
  });

  const [skills, setSkills] = useState([]);
  const [isProjectCreator, setIsProjectCreator] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchSkills();
  }, [projectId]);

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
      const response = await axios.get(`http://localhost:4000/tasks`, {
        params: { projectId }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchSkills = async () => {
    try {
        const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:profile',
        });

        const response = await axios.get('http://localhost:4000/profile/options', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        setSkills(response.data.skillsPool);

        const profileResponse = await axios.get('http://localhost:4000/profile', {
            params: { 
              sub: user.sub,
              email: user.email,
              name: user.name,
            },
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
    setTaskForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmitTask = async () => {
    if (!taskForm.title || !taskForm.description || !taskForm.skill) {
      alert('All fields are required');
      return;
    }
    try {
        if (taskForm.id) {
            // Update existing task via PUT request
            await axios.put(`http://localhost:4000/newtask/${taskForm.id}`, { ...taskForm, projectId });
          } else {
            // Create new task via POST request
            await axios.post('http://localhost:4000/newtask', { ...taskForm, projectId });
          }
      setShowTaskPopup(false);
      fetchTasks();
      setTaskForm({ id: null, title: '', description: '', skill: '', active: true });
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

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
            <input
              type="text"
              className="project-tags-input"
              value={project.tags?.join(', ') || ''}
              placeholder="Project Tags (comma separated)"
              onChange={(e) => setProject({ ...project, tags: e.target.value.split(',').map(tag => tag.trim()) })}
            />
          )}
        </div>
      )}

      <div className="tasks-section">
        <h2 className="tasks-title">Tasks</h2>
        {isProjectCreator && <button className="add-task-button" onClick={() => setShowTaskPopup(true)}>+</button>}
        <div className="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-card">
              <h3>{task.title || 'Untitled Task'}</h3>
              <p>{task.description || 'No description provided.'}</p>
              <p><strong>Skill:</strong> {task.skill || 'Not specified'}</p>
              {isProjectCreator && (
                <button onClick={() => {
                  setTaskForm(task);
                  setShowTaskPopup(true);
                }}>Edit</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showTaskPopup && (
        <div className="task-popup-overlay">
          <div className="task-popup">
            <h2>{taskForm.id ? 'Edit Task' : 'Add Task'}</h2>
            <input
              type="text"
              name="title"
              placeholder="Task Title"
              value={taskForm.title}
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
              value={taskForm.skill}
              onChange={handleTaskFormChange}
            >
              <option value="">Select Skill</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                name="active"
                checked={taskForm.active}
                onChange={handleTaskFormChange}
              />
              Active
            </label>
            <button onClick={handleSubmitTask} className="submit-task-button">{taskForm.id ? 'Update' : 'Create'}</button>
            <button onClick={() => setShowTaskPopup(false)} className="close-popup-button">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Project;
