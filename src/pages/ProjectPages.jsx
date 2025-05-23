import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography } from '@mui/material';
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
      <Typography variant="h4" className="project-page-title">Browse Projects</Typography> {/* className kept for now if it has margin/padding */}

      <div className="search-bar-container">
        <TextField
          variant="outlined"
          size="small"
          type="text"
          placeholder="Search Projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, marginRight: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => window.location.href = '/projectcreation'}
          title="Add New Project"
          sx={{ backgroundColor: 'primary.main', color: 'common.black', fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', minWidth: '40px', padding: 0 }}
        >
          +
        </Button>
      </div>

      <div className="project-list-wrapper">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <Typography variant="h6" sx={{ color: 'primary.main' }}>{project.name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{project.description}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1 }}>Tags: {project.tags.join(', ')}</Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ backgroundColor: 'primary.main', color: 'common.black', mr: 1 }}
              onClick={() => {
                setSelectedProject(project);
                fetchTasks(project.id);
              }}
            >
              Contribute
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
              onClick={() => {
                navigate(`/visualizer/${project.id}`);
              }}
            >
              Open Project
            </Button>
          </div>
        ))}
      </div>

      <div className="pagination-container">
        <Button
          variant="contained"
          sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', '&:disabled': { backgroundColor: 'action.disabledBackground' } }}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Typography className="page-text" sx={{ marginX: 2 }}>Page {page}</Typography> {/* className kept for now if it has margin/padding */}
        <Button
          variant="contained"
          sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', '&:disabled': { backgroundColor: 'action.disabledBackground' } }}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>

      {selectedProject && (
        <div className="task-popup-overlay">
        <div className="task-popup">
          <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>Tasks for {selectedProject.name}</Typography>
          <div className="ptask-list">
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
                  <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>{task.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{task.description}</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ backgroundColor: isAssigned ? 'error.main' : 'primary.main', color: isAssigned ? 'common.white' : 'common.black' }}
                    onClick={() => handleTaskAction(task.id, isAssigned ? 'drop' : 'accept')}
                  >
                    {isAssigned ? 'Drop' : 'Accept'}
                  </Button>
                </div>
              );
            }) : <Typography sx={{ color: 'text.secondary' }}>No tasks available</Typography>}
          </div>
          <Button
            variant="contained"
            sx={{ backgroundColor: 'error.main', color: 'common.white', marginTop: 2 }}
            onClick={() => setSelectedProject(null)}
          >
            Close
          </Button>
        </div>
        </div>
      )}
    </div>
  );
};

export default ProjectPages;