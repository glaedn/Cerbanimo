import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import './ProjectPages.css';

const ProjectPages = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  
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

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:4000/projects', {
        params: { search, page, auth0Id: user.sub },
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // Fetch tasks relevant to the user's skills for a selected project
  const fetchTasks = async (projectId) => {
    try {
      const response = await axios.get('http://localhost:4000/tasks/prelevant', {
        params: { skills: userProfile.skills, projectId },
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

   // Accept a task
   const acceptTask = async (taskId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.put(`http://localhost:4000/tasks/${taskId}/accept`, 
      { userId: userProfile.id }, 
      { headers: { Authorization: `Bearer ${token}` } });

      // Refresh the tasks to show updated assignment status
      if (selectedProject) {
        fetchRelevantTasks(selectedProject);
      }
    } catch (error) {
      console.error('Failed to accept task:', error);
    }
  };


  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [user, page, search]);

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
          onClick={() => window.location.href = '/project/create'}
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
        <span>Page {page}</span>
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
            {tasks.length > 0 ? tasks.map((task) => (
              <div key={task.id} className="task-card">
                <h3>{task.name}</h3>
                <p>{task.description}</p>
                <button
                  className="accept-button"
                  //disabled={!userProfile.skills.includes(task.skill_name)}
                  onClick={() => acceptTask(task.id)}
                >
                  Accept
                </button>
              </div>
            )) : <p>No tasks available</p>}
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
