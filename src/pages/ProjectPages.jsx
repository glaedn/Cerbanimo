import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import './ProjectPages.css';

const ProjectPages = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  const navigate = useNavigate();
  
  // Fetch user profile for skills
  const fetchUserProfile = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get('http://localhost:4000/profile', {
        params: { sub: user.sub },
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  // Comprehensive case-insensitive search function
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchProjects = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.get('http://localhost:4000/projects', {
        params: { search, page, auth0Id: user.sub },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      const searchTerm = search.trim();
  
      const filteredProjects = response.data.filter(project => {
        // Check if search term matches name or description
        return matchesSearch(project.name, searchTerm) || 
               matchesSearch(project.description, searchTerm);
      });
  
      setProjects(filteredProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // Updated fetchTasks to include assigned_user_ids and debug logging
  const fetchTasks = async (projectId) => {
    try {
      const token = await getAccessTokenSilently();
      
      const skillNames = userProfile.skills.map(skill => 
        typeof skill === 'object' ? skill.name : skill
      );
  
      const response = await axios.get('http://localhost:4000/tasks/prelevant', {
        params: { 
          skills: skillNames,
          projectId: projectId,
          returnAssignedUserIds: true // Add this flag to ensure backend returns assigned_user_ids
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        paramsSerializer: {
          indexes: null
        }
      });
    
      // Debug logging
      console.log('Fetched Tasks:', response.data);
      console.log('Current User Profile ID:', userProfile.id);
    
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Server status:', error.response.status);
      }
      console.error('Error config:', error.config);
    }
  };

  // Updated handleTaskAction to provide more detailed logging
  const handleTaskAction = async (taskId, action) => {
    try {
      const token = await getAccessTokenSilently();
      
      // Determine the appropriate endpoint based on the action
      const endpoint = action === 'accept' 
        ? `http://localhost:4000/tasks/${taskId}/accept`
        : `http://localhost:4000/tasks/${taskId}/drop`;

      const response = await axios.put(endpoint, 
        { userId: userProfile.id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Debug logging
      console.log(`${action} task response:`, response.data);

      // Refresh the tasks to show updated assignment status
      if (selectedProject) {
        fetchTasks(selectedProject.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} task:`, error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      fetchProjects();
    }
  }, [userProfile, page, search]);

  return (
    <div className="project-pages-container">
      <h1 className="project-page-title">Browse Projects</h1>

      <div className="search-bar-container">
        <input
          className="search-input"
          type="text"
          placeholder="Search Projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="add-project-button"
          onClick={() => window.location.href = '/projectcreation'}
          title="Add New Project"
        >
          +
        </button>
      </div>

      <div className="project-list-wrapper">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <h2 className="project-title">{project.name}</h2>
            <p className="project-description">{project.description}</p>
            <button
              className="contribute-button"
              onClick={() => {
                setSelectedProject(project);
                fetchTasks(project.id);
              }}
            >
              Contribute
            </button>
            <button
              className="open-project-button"
              onClick={() => {
                navigate(`/visualizer/${project.id}`);
              }}
            >
              Open Project
            </button>
          </div>
        ))}
      </div>

      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="page-text">Page {page}</span>
        <button
          className="pagination-button"
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </button>
      </div>

      {selectedProject && (
        <div className="task-popup-overlay">
        <div className="task-popup">
          <h2>Tasks for {selectedProject.name}</h2>
          <div className="task-list">
            {tasks.length > 0 ? tasks.map((task) => {
              // Robust check for task assignment
              const isAssigned = task.assigned_user_ids && 
                task.assigned_user_ids.some(
                  // Convert both to strings to ensure type-safe comparison
                  (userId) => String(userId) === String(userProfile.id)
                );

              // Debug logging for each task
              console.log(`Task ${task.id} assigned_user_ids:`, task.assigned_user_ids);
              console.log(`Current user ID:`, userProfile.id);
              console.log(`Is Assigned:`, isAssigned);

              return (
                <div key={task.id} className="task-card">
                  <h3>{task.name}</h3>
                  <p>{task.description}</p>
                  <button
                    className={`accept-button ${isAssigned ? 'drop-button' : ''}`}
                    onClick={() => handleTaskAction(task.id, isAssigned ? 'drop' : 'accept')}
                  >
                    {isAssigned ? 'Drop' : 'Accept'}
                  </button>
                </div>
              );
            }) : <p>No tasks available</p>}
          </div>
          <button
            className="close-popup-button"
            onClick={() => setSelectedProject(null)}
          >
            Close
          </button>
        </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPages;