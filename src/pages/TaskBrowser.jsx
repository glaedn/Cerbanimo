import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import './TaskBrowser.css'; // Import the new styles

const TaskBrowser = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchProfileAndTasks = async () => {
        try {
          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:profile',
          });

          // Fetch user profile
          const profileResponse = await axios.get('http://localhost:4000/profile', {
            params: { sub: user.sub, email: user.email, name: user.name },
            headers: { Authorization: `Bearer ${token}` },
          });

          const userSkills = profileResponse.data.skills || [];
          const userInterests = profileResponse.data.interests || [];

          if (userSkills.length === 0) {
            setError('No skills found. Please update your profile.');
            return;
          }

          // Fetch all relevant tasks
          const tasksResponse = await axios.get('http://localhost:4000/tasks/relevant', {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` },
          });

          // Sort tasks based on shared project tags and user interests
          const sortedTasks = tasksResponse.data.sort((a, b) => {
            const sharedA = a.projectTags?.filter(tag => userInterests.includes(tag)).length || 0;
            const sharedB = b.projectTags?.filter(tag => userInterests.includes(tag)).length || 0;
            return sharedB - sharedA; // Sort in descending order
          });

          // Add shared tags to each task for display
          const tasksWithSharedTags = sortedTasks.map(task => ({
            ...task,
            sharedTags: task.projectTags?.filter(tag => userInterests.includes(tag)) || [],
            sharedTagsCount: task.projectTags?.filter(tag => userInterests.includes(tag)).length || 0,
          }));

          setTasks(tasksWithSharedTags);
        } catch (err) {
          console.error('Error fetching tasks:', err);
          setError('Failed to fetch tasks.');
        }
      };

      fetchProfileAndTasks();
    }
  }, [isAuthenticated, getAccessTokenSilently, user]);

  return (
    <Box className="task-browser-container">
      <Typography variant="h4" gutterBottom className="task-title">
        Available Tasks
      </Typography>
      {error && <Typography color="error">{error}</Typography>}

      <Paper elevation={5} className="task-list">
        <List>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <ListItem key={task.id} divider className="task-item">
                <ListItemText
                  primary={<span className="task-name">{task.name}</span>}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" className="task-description">
                        {task.description}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" className="task-tags">
                        {task.sharedTagsCount > 0
                          ? `🔹 Shared Interests: ${task.sharedTags.join(', ')}`
                          : '⚠️ No shared interests'}
                      </Typography>
                      <br />
                      <Link href={`/project/${task.projectId}`} className="task-link">
                        🚀 View Project
                      </Link>
                    </>
                  }
                />
              </ListItem>
            ))
          ) : (
            <Typography className="no-tasks">No matching tasks found.</Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default TaskBrowser;
