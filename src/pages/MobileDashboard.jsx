import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, Avatar, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import MobileTaskCard from '../components/MobileTaskCard';
import ChronicleTimeline from '../components/ChronicleTimeline';
import GalacticActivityMap from '../components/GalacticActivityMap/GalacticActivityMap';
import SignalFeed from '../components/HUD/panels/SignalFeed';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import useSkillData from '../hooks/useSkillData';

const MobileDashboard = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserProfile();
  const { allSkills, loading: skillsLoading } = useSkillData();
  const [activeTasks, setActiveTasks] = useState([]);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [userChronicle, setUserChronicle] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      try {
        const token = await getAccessTokenSilently();

        // Fetch Active Tasks (Accepted)
        const activeRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
          params: { userId: profile.id.toString() },
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveTasks(activeRes.data);

        // Fetch Suggested (Relevant)
        const userSkills = profile.skills?.map(s => {
            try { return typeof s === 'string' ? JSON.parse(s).name : s.name; } catch(e) { return s; }
        }) || [];

        if (userSkills.length > 0) {
          const suggestedRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/relevant`, {
              params: { skills: userSkills },
              headers: { Authorization: `Bearer ${token}` }
          });
          setSuggestedTasks(suggestedRes.data.slice(0, 5));
        }

        // Fetch both chronicle entries and weekly wrap-up summaries
        const [chronicleRes, summariesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${profile.id}/chronicle`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/story_engine_v2/summaries/user/${profile.id}?type=weekly%20wrap-up`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const combinedData = [
          ...(Array.isArray(chronicleRes.data) ? chronicleRes.data : []),
          ...(Array.isArray(summariesRes.data) ? summariesRes.data : [])
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setUserChronicle(combinedData.slice(0, 5)); // Limit to latest 5 for mobile dashboard
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, [profile?.id]);

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
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/accept`, {
          userId: profile.id
      }, {
          headers: { Authorization: `Bearer ${token}` }
      });

      // Background refresh to sync with server truth
      const userSkills = profile?.skills?.map(s => {
          try { return typeof s === 'string' ? JSON.parse(s).name : s.name; } catch(e) { return s; }
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

  // Calculate Total Global Experience from allSkills
  let totalGlobalExp = 0;
  if (allSkills && profile && profile.id) {
    allSkills.forEach(skill => {
      if (skill.unlocked_users && Array.isArray(skill.unlocked_users)) {
        skill.unlocked_users.forEach(userEntry => {
          if (userEntry && typeof profile.id !== 'undefined') {
            const entryUserId = parseInt(userEntry.user_id, 10);
            const currentProfileId = parseInt(profile.id, 10);

            if (entryUserId === currentProfileId) {
              const experienceValue = userEntry.experience !== undefined ? userEntry.experience : userEntry.exp;
              if (typeof experienceValue === 'number') {
                totalGlobalExp += experienceValue;
              }
            }
          }
        });
      }
    });
  }

  const currentLevel = Math.floor(Math.sqrt(totalGlobalExp / 40)) + 1;
  const expForCurrentLevel = 40 * Math.pow(currentLevel - 1, 2);
  const expForNextLevel = 40 * Math.pow(currentLevel, 2);
  const currentLevelExpProgress = totalGlobalExp - expForCurrentLevel;
  const totalExpNeededForNextLevelSpan = expForNextLevel - expForCurrentLevel;

  let xpPercentage = 0;
  if (totalExpNeededForNextLevelSpan > 0) {
      xpPercentage = (currentLevelExpProgress / totalExpNeededForNextLevelSpan) * 100;
  } else if (currentLevelExpProgress >= 0) {
      xpPercentage = currentLevel === 1 && totalGlobalExp === 0 ? 0 : 100;
  }
  xpPercentage = Math.min(Math.max(xpPercentage, 0), 100);

  if (profileLoading || skillsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6" sx={{ color: '#00F3FF' }}>Loading Dashboard...</Typography>
      </Box>
    );
  }

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
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <Box sx={{ height: '200px', width: '100%', mb: 2, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 243, 255, 0.3)' }}>
            <GalacticActivityMap showLoadingText={false} enableTooltips={false} enableClicks={false} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Avatar src={user.picture} sx={{ border: '2px solid #00F3FF' }} />
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                Welcome, {user.given_name || user.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#00F3FF' }}>
                Level {currentLevel} Architect
              </Typography>
              <Typography variant="caption" sx={{ color: '#00F3FF', mt: 0.5, display: 'block' }}>
                Galactic Credits: {profile.tokens !== undefined ? profile.tokens : 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Box
            onClick={() => navigate('/activity-map')}
            sx={{
              color: '#00F3FF',
              fontSize: '0.7rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'Orbitron'
            }}
          >
            VIEW_MAP
          </Box>
        </Box>
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>XP Progress</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {Math.round(currentLevelExpProgress)} / {Math.round(totalExpNeededForNextLevelSpan)} XP
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={xpPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: '#00F3FF' }
            }}
          />
        </Box>
      </Paper>

      {/* 2. Ecosystem Signals */}
      <motion.div variants={itemVariants}>
        <Typography variant="h6" sx={{ color: '#00F3FF', mb: 2, fontWeight: 'bold' }}>
          Ecosystem Signals
        </Typography>
      </motion.div>
      <Paper
        component={motion.div}
        variants={itemVariants}
        sx={{
          p: 1,
          mb: 3,
          backgroundColor: 'rgba(10, 10, 46, 0.6)',
          border: '1px solid rgba(0, 243, 255, 0.4)',
          borderRadius: '12px'
        }}
      >
        <SignalFeed />
      </Paper>

      {/* 3. Active Tasks */}
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
        {activeTasks.filter(task => !task.status?.toLowerCase().includes('completed')).length > 0 ? (
          activeTasks
            .filter(task => !task.status?.toLowerCase().includes('completed'))
            .map(task => (
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
