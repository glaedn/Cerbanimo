import * as React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, List, ListItem, ListItemText, Link, Paper, Tabs, Tab } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileTaskCard from '../components/MobileTaskCard';
import { motion, AnimatePresence } from 'framer-motion';
import './TaskBrowser.css';

const TaskBrowser = ({ initialTab = 0 }) => {
  const isMobile = useIsMobile();
  const [tabValue, setTabValue] = useState(initialTab);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
      
          // Sort tasks based on priority score and shared interests
          const sortedTasks = tasksResponse.data.sort((a, b) => {
            // Sort by Priority Score (primary) and shared tags (secondary)
            if ((b.priority_score || 0) !== (a.priority_score || 0)) {
                return (b.priority_score || 0) - (a.priority_score || 0);
            }

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

  const renderTaskList = (taskList, type) => {
    if (isMobile) {
      return (
        <Box
          component={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mobile-container"
          sx={{ mt: 2 }}
        >
          <AnimatePresence mode="popLayout">
            {taskList.length > 0 ? (
              taskList.map(task => (
                <MobileTaskCard
                  key={task.id}
                  task={{...task, status: type === 'available' ? 'available' : task.status}}
                  onAccept={(id) => console.log('Accepting task', id)} // Placeholder
                />
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Typography className="no-tasks">No tasks found.</Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      );
    }

    return (
      <Paper elevation={5} className="task-list">
        <List>
          {taskList.length > 0 ? (
            taskList.map((task) => (
              <ListItem key={task.id} divider className="task-item">
                <ListItemText
                  primary={<span className="task-name">{task.name}</span>}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" className="task-description">{task.description}</Typography>
                      <br />
                      {type === 'available' && (
                        <Typography component="span" variant="body2" className="task-tags">
                          {task.sharedTagsCount > 0 ? `🔹 Shared Interests: ${task.sharedTags.join(', ')}` : '⚠️ No shared interests'}
                        </Typography>
                      )}
                      {type === 'accepted' && (
                        <Typography component="span" variant="body2" className="task-status">
                          {task.status === 'submitted' && task.approvals?.length >= 2 ? `⏳ Awaiting PM Approval` :
                          task.status === 'submitted' ? `✅ Submitted for Peer Review` :
                          `⌛ In Progress`}
                        </Typography>
                      )}
                      {type === 'review' && (
                        <Typography component="span" variant="body2" className="task-status">
                          {`📝 Needs Review (${task.approvals?.length || 0} approvals, ${task.rejections?.length || 0} rejections)`}
                        </Typography>
                      )}
                      <br />
                      {type === 'available' && (
                        <Typography component="span" variant="body2" sx={{ color: '#00f3ff', fontWeight: 'bold' }}>
                          ⚡ Priority Score: {(task.priority_score || 0).toFixed(1)}
                        </Typography>
                      )}
                      {task.public_good_score && (
                        <>
                          <br />
                          <Typography component="span" variant="body2" sx={{ color: '#7CFFB2', fontWeight: 'bold' }}>
                            Public Good x{Number(task.public_good_score || 1).toFixed(1)}
                          </Typography>
                        </>
                      )}
                      {task.project_id && (
                        <><br /><Link href={`/visualizer/${task.project_id}`} className="task-link">🚀 View Project</Link></>
                      )}
                      {type === 'review' && task.project_id && task.id && (
                        <><br /><Link href={`/visualizer/${task.project_id}/${task.id}`} className="task-link">✏️ Review Task</Link></>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))
          ) : <Typography className="no-tasks">No matching tasks found.</Typography>}
        </List>
      </Paper>
    );
  };

  if (isMobile) {
    return (
      <Box className="task-browser mobile-task-browser" sx={{ pb: 10 }}>
        <Typography variant="h5" sx={{ p: 2, pt: 3, color: '#00F3FF', fontWeight: 'bold', textAlign: 'center', fontFamily: 'Orbitron' }}>
          MISSION_COMMAND
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'rgba(0, 243, 255, 0.2)',
            '& .MuiTabs-indicator': { backgroundColor: '#00F3FF' },
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.5)',
              minHeight: '48px',
              fontFamily: 'Orbitron',
              fontSize: '0.75rem',
              '&.Mui-selected': { color: '#00F3FF' }
            }
          }}
        >
          <Tab label="SCAN" />
          <Tab label="ACTIVE" />
          <Tab label="REVIEW" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tabValue === 0 && renderTaskList(tasks, 'available')}
          {tabValue === 1 && renderTaskList(acceptedTasks, 'accepted')}
          {tabValue === 2 && renderTaskList(approvalTasks, 'review')}
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="row" className="task-browser">
      <Box className="task-browser-container" flex={1}>
        <Typography variant="h4" gutterBottom className="task-title">Available Tasks</Typography>
        {error && <Typography color="error">{error}</Typography>}
        {renderTaskList(tasks, 'available')}
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Accepted Tasks</Typography>
        {renderTaskList(acceptedTasks, 'accepted')}
      </Box>
      
      <Box flex={1} className="task-browser-container">
        <Typography variant="h4" gutterBottom className="task-title">Review Tasks</Typography>
        {renderTaskList(approvalTasks, 'review')}
      </Box>
    </Box>
  );
};

export default TaskBrowser;
