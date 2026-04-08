import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, Avatar, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import MobileTaskCard from '../components/MobileTaskCard';
import ChronicleTimeline from '../components/ChronicleTimeline';
import { motion } from 'framer-motion';

const MobileDashboard = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [userChronicle, setUserChronicle] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        // Fetch Profile
        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
          params: { sub: user.sub, email: user.email },
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(profileRes.data);

        // Fetch Active Tasks (Accepted)
        if (profileRes.data.id) {
          const activeRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
            params: { userId: profileRes.data.id.toString() },
            headers: { Authorization: `Bearer ${token}` }
          });
          setActiveTasks(activeRes.data);

          // Fetch Suggested (Relevant)
          const userSkills = profileRes.data.skills?.map(s => {
              try { return JSON.parse(s).name; } catch(e) { return s; }
          }) || [];

          if (userSkills.length > 0) {
            const suggestedRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/relevant`, {
                params: { skills: userSkills },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuggestedTasks(suggestedRes.data.slice(0, 5));
          }

          // Fetch Chronicle
          const chronicleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/story/user/${profileRes.data.id}/chronicle`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserChronicle(chronicleRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, [user, getAccessTokenSilently]);

  const handleAcceptTask = async (taskId) => {
    const originalSuggested = [...suggestedTasks];
    const originalActive = [...activeTasks];

    // Optimistically move task from suggested to active
    const taskToMove = suggestedTasks.find(t => t.id === taskId);
    if (taskToMove) {
      setSuggestedTasks(prev => prev.filter(t => t.id !== taskId));
      setActiveTasks(prev => [...prev, { ...taskToMove, status: 'active-assigned' }]);
    }

    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/accept`, {}, {
          headers: { Authorization: `Bearer ${token}` }
      });

      // Background refresh to sync with server truth
      const userSkills = profile?.skills?.map(s => {
          try { return JSON.parse(s).name; } catch(e) { return s; }
      }) || [];

      const [suggestedRes, activeRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/relevant`, {
            params: { skills: userSkills },
            headers: { Authorization: `Bearer ${token}` }
        }),
        profile?.id ? axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
            params: { userId: profile.id.toString() },
            headers: { Authorization: `Bearer ${token}` }
        }) : Promise.resolve({ data: originalActive })
      ]);

      setSuggestedTasks(suggestedRes.data.slice(0, 5));
      setActiveTasks(activeRes.data);
    } catch (err) {
      console.error('Error accepting task:', err);
      // Rollback
      setSuggestedTasks(originalSuggested);
      setActiveTasks(originalActive);
    }
  };

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const nextLevelXp = 100; // Assuming 100 for now
  const xpProgress = (xp / nextLevelXp) * 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mobile-container"
      sx={{ pb: 8, pt: 2 }}
    >
      {/* 1. Greeting + Level */}
      <Paper
        component={motion.div}
        variants={itemVariants}
        sx={{
        p: 2,
        mb: 3,
        backgroundColor: 'rgba(10, 10, 46, 0.8)',
        border: '1px solid #00F3FF',
        borderRadius: '12px'
      }}>
        <Box display="flex" alignItems="center" gap={2} mb={1}>
          <Avatar src={user.picture} sx={{ border: '2px solid #00F3FF' }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
              Welcome, {user.given_name || user.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#00F3FF' }}>
              Level {level} Architect
            </Typography>
          </Box>
        </Box>
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>XP Progress</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{xp}/{nextLevelXp}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={xpProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#00F3FF' }
            }}
          />
        </Box>
      </Paper>

      {/* 2. Active Tasks */}
      <motion.div variants={itemVariants}>
        <Typography variant="h6" sx={{ color: '#00F3FF', mb: 2, fontWeight: 'bold' }}>
          Active Missions
        </Typography>
      </motion.div>
      <Box
        component={motion.div}
        variants={itemVariants}
        sx={{
        display: 'flex',
        overflowX: 'auto',
        gap: 2,
        pb: 2,
        '&::-webkit-scrollbar': { display: 'none' }
      }}>
        {activeTasks.length > 0 ? (
          activeTasks.map(task => (
            <Box key={task.id} sx={{ minWidth: '280px' }}>
              <MobileTaskCard task={task} onAccept={handleAcceptTask} />
            </Box>
          ))
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            No active missions.
          </Typography>
        )}
      </Box>

      {/* 3. Suggested Tasks */}
      <motion.div variants={itemVariants}>
        <Typography variant="h6" sx={{ color: '#00F3FF', mt: 2, mb: 2, fontWeight: 'bold' }}>
          Suggested for You
        </Typography>
      </motion.div>
      <Box component={motion.div} variants={itemVariants}>
        <List disablePadding>
          {suggestedTasks.map(task => (
            <MobileTaskCard key={task.id} task={{...task, status: 'available'}} onAccept={handleAcceptTask} />
          ))}
        </List>
      </Box>

      {/* 4. Recent Stories */}
      <motion.div variants={itemVariants}>
        <Typography variant="h6" sx={{ color: '#00F3FF', mt: 3, mb: 2, fontWeight: 'bold' }}>
          Recent Chronicle
        </Typography>
      </motion.div>
      <Paper
        component={motion.div}
        variants={itemVariants}
        sx={{
        p: 1,
        backgroundColor: 'rgba(28, 28, 30, 0.5)',
        borderRadius: '12px'
      }}>
        <ChronicleTimeline stories={userChronicle} />
      </Paper>
    </Box>
  );
};

export default MobileDashboard;
