import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import './TaskBrowser.css';

const TaskBrowser = () => {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [tasks, setTasks] = useState([]);
  const [acceptedTasks, setAcceptedTasks] = useState([]);
  const [approvalTasks, setApprovalTasks] = useState([]);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

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
      
          // Log the entire interests data to inspect the structure
          console.log('User Interests Raw:', profileResponse.data.interests);
      
          // If interests are available, parse them and extract names (otherwise fallback to empty array)
          const usersInterests = profileResponse.data.interests?.map(interest => {
            try {
              const parsedInterest = JSON.parse(interest);  // Parse JSON
              return parsedInterest.name.toLowerCase().trim(); // Extract 'name' and normalize
            } catch (error) {
              console.error('Error parsing interest:', interest, error);
              return null;  // Handle invalid JSON gracefully
            }
          }).filter(interest => interest !== null) || [];
          console.log('User Interests:', usersInterests);
      
          // Extract skills
          const userSkills = profileResponse.data.skills
            .map(skill => {
              try {
                const parsedSkill = JSON.parse(skill); // Parse the JSON string
                return parsedSkill.name.toLowerCase().trim(); // Extract and normalize the skill name
              } catch (error) {
                console.error('Error parsing skill:', skill, error);
                return null; // Handle invalid JSON strings gracefully
              }
            })
            .filter(skill => skill !== null);
      
          console.log('Extracted skills:', userSkills);
      
          // Set user id in state
          const fetchedUserId = profileResponse.data.id || null;
          setUserId(fetchedUserId);
      
          // If no skills found, return early with an error message
          if (userSkills.length === 0) {
            setError('No skills found. Please update your profile.');
            return;
          }
      
          // Fetch all relevant tasks based on user skills
          const tasksResponse = await axios.get('http://localhost:4000/tasks/relevant', {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` },
          });
      
          // Sort tasks based on shared project tags and user interests
          const sortedTasks = tasksResponse.data.sort((a, b) => {
            // Count shared tags for Task A and Task B, normalized for comparison
            const sharedA = a.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            const sharedB = b.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
      
            console.log(`Shared Tags for Task A: ${sharedA}, Shared Tags for Task B: ${sharedB}`);
      
            return sharedB - sharedA; // Sort in descending order based on shared tags
          });
      
          // Add shared tags to each task for display purposes
          const tasksWithSharedTags = sortedTasks.map(task => ({
            ...task,
            sharedTags: Array.isArray(task.projectTags)
              ? task.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim()))
              : [],
            sharedTagsCount: Array.isArray(task.projectTags)
              ? task.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length
              : 0,
          }));
      
          // Log the tasks with shared tags
          console.log('Tasks with Shared Tags:', tasksWithSharedTags);
      
          // Update state with tasks containing shared tags and count
          setTasks(tasksWithSharedTags);
      
        } catch (err) {
          console.error('Error fetching profile or tasks:', err);
          setError(`Failed to fetch profile or tasks: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchAcceptedTasks = async () => {
        try {
          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:profile',
          });

          const userIdString = userId ? userId.toString() : null;
          console.log("Sending userId as:", userIdString);

          // Only fetch accepted tasks if we have a user ID
          if (userIdString) {
            const acceptedResponse = await axios.get('http://localhost:4000/tasks/accepted', {
              params: { userId: userIdString },
              headers: { Authorization: `Bearer ${token}` },
            });

            console.log("Accepted Tasks Response:", acceptedResponse.data);
            setAcceptedTasks(acceptedResponse.data);
          } else {
            console.warn("No user ID available to fetch accepted tasks");
          }
        } catch (err) {
          console.error('Full error object for accepted tasks:', err);
          console.error('Error details:', err.response?.data);
          setError(`Failed to fetch accepted tasks: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchApprovalTasks = async () => {
        try {
          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:profile',
          });

          const userIdString = userId ? userId.toString() : null;
          console.log("Fetching review tasks for userId:", userIdString);

          if (userIdString) {
            const approvalResponse = await axios.get(`http://localhost:4000/tasks/reviewer/${userIdString}`, {
              params: { userId: userIdString },
              headers: { Authorization: `Bearer ${token}` },
            });

            console.log("Review Tasks Response:", approvalResponse.data);
            setApprovalTasks(approvalResponse.data);
          } else {
            console.warn("No user ID available to fetch review tasks");
          }
        } catch (err) {
          console.error('Error fetching review tasks:', err);
          setError(`Failed to fetch review tasks: ${err.response?.data?.message || err.message}`);
        }
      };

      fetchProfileAndTasks();
      fetchAcceptedTasks();
      fetchApprovalTasks();
    }
  }, [isAuthenticated, getAccessTokenSilently, user, userId]);

  return (
    <Box display="flex" flexDirection="row" className="task-browser">
      <Box className="task-browser-container" flex={1}>
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
                        <Link href={`/visualizer/${task.project_id}`} className="task-link">
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
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">
          Accepted Tasks
        </Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {acceptedTasks.length > 0 ? (
              acceptedTasks.map((task) => (
                <ListItem key={task.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{task.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">
                          {task.description}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {task.submitted ? `✅ Submitted` : `⌛ In Progress`}
                        </Typography>
                        <br />
                        <Link href={`/visualizer/${task.project_id}`} className="task-link">
                          🚀 View Project
                        </Link>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <Typography className="no-tasks">No accepted tasks yet.</Typography>
            )}
          </List>
        </Paper>
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">
          Review Tasks
        </Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {approvalTasks.length > 0 ? (
              approvalTasks.map((task) => (
                <ListItem key={task.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{task.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">
                          {task.description}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {`📝 Needs Review (${task.approvals || 0} approvals, ${task.rejections || 0} rejections)`}
                        </Typography>
                        <br />
                        <Link href={`/visualizer/`} className="task-link">
                          🚀 View Project
                        </Link>
                        <br />
                        <Link href={`/visualizer/${task.project_id}/${task.id}`} className="task-link">
                          ✏️ Review Task
                        </Link>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <Typography className="no-tasks">No tasks to review.</Typography>
            )}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default TaskBrowser;