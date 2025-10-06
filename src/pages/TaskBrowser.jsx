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
            audience: import.meta.env.VITE_BACKEND_URL,
            scope: 'openid profile email read:profile',
          });
      
          const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            params: { sub: user.sub, email: user.email, name: user.name },
            headers: { Authorization: `Bearer ${token}` },
          });
      
          const usersInterests = profileResponse.data.interests?.map(interest => {
            try {
              const parsedInterest = JSON.parse(interest);
              return parsedInterest.name.toLowerCase().trim();
            } catch (error) {
              return null;
            }
          }).filter(interest => interest !== null) || [];
      
          const userSkills = profileResponse.data.skills
            .map(skill => {
              try {
                const parsedSkill = JSON.parse(skill);
                return parsedSkill.name.toLowerCase().trim();
              } catch (error) {
                return null;
              }
            })
            .filter(skill => skill !== null);
      
          const fetchedUserId = profileResponse.data.id || null;
          setUserId(fetchedUserId);
      
          if (userSkills.length === 0) {
            setError('No skills found. Please update your profile.');
            return;
          }
      
          const tasksResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/relevant`, {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` },
          });
      
          const sortedTasks = tasksResponse.data.sort((a, b) => {
            const sharedA = a.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            const sharedB = b.projectTags?.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length || 0;
            return sharedB - sharedA;
          });
      
          const tasksWithSharedTags = sortedTasks.map(task => ({
            ...task,
            sharedTags: Array.isArray(task.projectTags)
              ? task.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim()))
              : [],
            sharedTagsCount: Array.isArray(task.projectTags)
              ? task.projectTags.filter(tag => typeof tag === 'string' && usersInterests.includes(tag.toLowerCase().trim())).length
              : 0,
          }));
      
          setTasks(tasksWithSharedTags);
      
        } catch (err) {
          setError(`Failed to fetch profile or tasks: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchAcceptedTasks = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const acceptedResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
            params: { userId: userId.toString() },
            headers: { Authorization: `Bearer ${token}` },
          });
          setAcceptedTasks(acceptedResponse.data);
        } catch (err) {
          setError(`Failed to fetch accepted tasks: ${err.response?.data?.message || err.message}`);
        }
      };

      const fetchApprovalTasks = async () => {
        if (!userId) return;
        try {
          const token = await getAccessTokenSilently();
          const approvalResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/reviewer/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setApprovalTasks(approvalResponse.data);
        } catch (err) {
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
        <Typography variant="h4" gutterBottom className="task-title">Available Tasks</Typography>
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
                        <Typography component="span" variant="body2" className="task-description">{task.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-tags">
                          {task.sharedTagsCount > 0 ? `🔹 Shared Interests: ${task.sharedTags.join(', ')}` : '⚠️ No shared interests'}
                        </Typography>
                        <br />
                        {task.project_id && <Link href={`/lotus-map/${task.project_id}`} className="task-link">🚀 View Intention</Link>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No matching tasks found.</Typography>}
          </List>
        </Paper>
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Accepted Tasks</Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {acceptedTasks.length > 0 ? (
              acceptedTasks.map((task) => (
                <ListItem key={task.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{task.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">{task.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {task.status === 'submitted' && task.approvals?.length >= 2 ? `⏳ Awaiting PM Approval` :
                           task.status === 'submitted' ? `✅ Submitted for Peer Review` :
                           `⌛ In Progress`}
                        </Typography>
                        <br />
                        <Link href={`/lotus-map/${task.project_id}`} className="task-link">🚀 View Intention</Link>
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No accepted tasks yet.</Typography>}
          </List>
        </Paper>
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Review Tasks</Typography>
        <Paper elevation={5} className="task-list">
          <List>
            {approvalTasks.length > 0 ? (
              approvalTasks.map((task) => (
                <ListItem key={task.id} divider className="task-item">
                  <ListItemText
                    primary={<span className="task-name">{task.name}</span>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" className="task-description">{task.description}</Typography>
                        <br />
                        <Typography component="span" variant="body2" className="task-status">
                          {`📝 Needs Review (${task.approvals?.length || 0} approvals, ${task.rejections?.length || 0} rejections)`}
                        </Typography>
                        {task.project_id && <><br /><Link href={`/lotus-map/${task.project_id}`} className="task-link">🚀 View Intention</Link></>}
                        {task.project_id && task.id && <><br /><Link href={`/lotus-map/${task.project_id}/${task.id}`} className="task-link">✏️ Review Task</Link></>}
                      </>
                    }
                  />
                </ListItem>
              ))
            ) : <Typography className="no-tasks">No tasks to review.</Typography>}
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default TaskBrowser;