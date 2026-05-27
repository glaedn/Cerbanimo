import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Typography, Chip, Box, Grid } from '@mui/material';
import { useIsMobile } from '../hooks/useIsMobile';
import './ProjectPages.css';
import ReactMarkdown from 'react-markdown';
import useSkillData from '../hooks/useSkillData';

const ProjectPages = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { allSkills } = useSkillData();
  
  // Fetch user profile for skills
  const fetchUserProfile = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
        params: { sub: user.sub },
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchProjects = async () => {
    if (!userProfile) return;
    
    setIsLoading(true);
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/projects/personal`, {
        params: { 
          search: search.trim(),
          page: page,
          auth0Id: user.sub 
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const projectsData = response.data;
      setProjects(projectsData);
      
      // Since your backend uses LIMIT 10, if we get less than 10 projects, 
      // we're likely on the last page
      setHasMorePages(projectsData.length === 10);
      
      // For display purposes - this won't be perfectly accurate without a count query
      // but gives users a sense of their position
      const estimatedTotal = (page - 1) * 10 + projectsData.length;
      setTotalProjects(hasMorePages ? `${estimatedTotal}+` : estimatedTotal);
      
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
      setHasMorePages(false);
      setTotalProjects(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Updated fetchTasks to include assigned_user_ids and debug logging
  const fetchTasks = async (projectId) => {
    try {
      const token = await getAccessTokenSilently();
      
      const skillNames = userProfile.skills.map(skill => 
        typeof skill === 'object' ? skill.name : skill
      );
  
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/prelevant`, {
        params: { 
          skills: skillNames,
          projectId: projectId,
          returnAssignedUserIds: true
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        paramsSerializer: {
          indexes: null
        }
      });
    
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

  const handleTaskAction = async (taskId, action) => {
    try {
      const token = await getAccessTokenSilently();
      
      const endpoint = action === 'accept' 
        ? `${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/accept`
        : `${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/drop`;

      const response = await axios.put(endpoint, 
        { userId: userProfile.id }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`${action} task response:`, response.data);

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

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    // Reset to page 1 when search changes
    setPage(1);
  };

  // Handle page navigation
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMorePages) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [userProfile, page, search]);

  return (
    <div className={`project-pages-container ${isMobile ? 'mobile-registry' : ''}`} style={{ pb: isMobile ? '80px' : '20px' }}>
      <div className="search-bar-container" style={{ width: isMobile ? '100%' : '80%', marginBottom: isMobile ? '24px' : '40px' }}>
        <TextField
          variant="outlined"
          size="small"
          type="text"
          placeholder="Search Projects..."
          value={search}
          onChange={handleSearchChange}
          sx={{
            flexGrow: 1,
            marginRight: 1,
            '& .MuiOutlinedInput-root': {
              height: isMobile ? '56px' : '40px'
            }
          }}
        />
        <Button
          variant="contained"
          onClick={() => navigate('/projectcreation')}
          title="Add New Project"
          sx={{
            backgroundColor: 'primary.main',
            color: 'common.black',
            fontSize: '1.5rem',
            width: isMobile ? '56px' : '40px',
            height: isMobile ? '56px' : '40px',
            borderRadius: '50%',
            minWidth: isMobile ? '56px' : '40px',
            padding: 0
          }}
        >
          +
        </Button>
      </div>

      <div className="project-list-wrapper" style={{ width: isMobile ? '100%' : '80%' }}>
        <Grid container spacing={isMobile ? 2 : 0} direction={isMobile ? 'column' : 'row'}>
        {projects.map((project) => (
          <Grid item xs={12} key={project.id} sx={{ width: '100%' }}>
            <div className="project-card glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>{project.name}</Typography>
                <div className="relevance-meter-container">
                  <span className="meter-label">RELEVANCE</span>
                  <div className="relevance-meter">
                    <div
                      className="relevance-fill"
                      style={{ width: `${Math.min(100, (project.relevance_score || 0) * 20)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', marginTop: '8px' }}>
                {project.project_skills && project.project_skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={`${skill.name} (Lv. ${Math.round(skill.level || 0)})`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(95, 240, 255, 0.1)',
                      color: '#5FF0FF',
                      border: '1px solid rgba(95, 240, 255, 0.3)',
                      fontFamily: 'Orbitron',
                      fontSize: '0.7rem'
                    }}
                  />
                ))}
              </div>

              <ReactMarkdown variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{project.description}</ReactMarkdown>

              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} mt={2}>
                <Button
                  className="glass-btn-contribute"
                  variant="text"
                  size="small"
                  fullWidth={isMobile}
                  onClick={() => {
                    setSelectedProject(project);
                    fetchTasks(project.id);
                  }}
                >
                  Contribute
                </Button>
                <Button
                  className="glass-btn-open"
                  variant="text"
                  size="small"
                  fullWidth={isMobile}
                  onClick={() => {
                    navigate(`/visualizer/${project.id}`);
                  }}
                >
                  Open Project
                </Button>
              </Box>
            </div>
          </Grid>
        ))}
        </Grid>
      </div>

      <div className="pagination-container" style={{ width: isMobile ? '100%' : '80%', justifyContent: 'center', marginBottom: isMobile ? '40px' : '0' }}>
        <Button
          variant="contained"
          sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', '&:disabled': { backgroundColor: 'action.disabledBackground' }, height: isMobile ? '48px' : 'auto' }}
          onClick={handlePreviousPage}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Typography className="page-text" sx={{ marginX: 2 }}>
          Page {page}
        </Typography>
        <Button
          variant="contained"
          sx={{ backgroundColor: 'accentPurple.main', color: 'text.primary', '&:disabled': { backgroundColor: 'action.disabledBackground' }, height: isMobile ? '48px' : 'auto' }}
          onClick={handleNextPage}
          disabled={!hasMorePages}
        >
          Next
        </Button>
      </div>

      {selectedProject && (
        <div className="task-popup-overlay">
          <div className="task-popup" style={{ width: isMobile ? '90%' : '80%', padding: isMobile ? '15px' : '20px' }}>
            <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>Tasks for {selectedProject.name}</Typography>
            <div className="ptask-list">
              {tasks.length > 0 ? tasks.map((task) => {
                const isAssigned = task.assigned_user_ids && 
                  task.assigned_user_ids.some(
                    (userId) => String(userId) === String(userProfile.id)
                  );

                console.log(`Task ${task.id} assigned_user_ids:`, task.assigned_user_ids);
                console.log(`Current user ID:`, userProfile.id);
                console.log(`Is Assigned:`, isAssigned);

                const skillName = allSkills.find(skill => Number(skill.id) === Number(task.skill_id))?.name || 'Unknown Skill';
                return (
                  <div key={task.id} className="task-card">
                    <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>{task.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{task.description}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Status: {task.status}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Skill: {skillName} (Level: {task.skill_level})</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Reward: {(task.reward_tokens || 0)} Tokens</Typography>
                    <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={1}>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth={isMobile}
                        sx={{ backgroundColor: isAssigned ? 'error.main' : 'primary.main', color: isAssigned ? 'common.white' : 'common.black', height: isMobile ? '48px' : 'auto' }}
                        onClick={() => handleTaskAction(task.id, isAssigned ? 'drop' : 'accept')}
                      >
                        {isAssigned ? 'Drop' : 'Accept'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        fullWidth={isMobile}
                        sx={{ borderColor: 'primary.main', color: 'primary.main', height: isMobile ? '48px' : 'auto' }}
                        onClick={() => navigate(`/visualizer/${selectedProject.id}/${task.id}`)}
                      >
                        View Task
                      </Button>
                    </Box>
                  </div>
                );
              }) : <Typography sx={{ color: 'text.secondary' }}>No tasks available</Typography>}
            </div>
            <Button
              variant="contained"
              fullWidth={isMobile}
              sx={{ backgroundColor: 'error.main', color: 'common.white', marginTop: 2, height: isMobile ? '48px' : 'auto' }}
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