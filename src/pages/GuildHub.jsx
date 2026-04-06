import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Grid, Card, CardContent, Chip,
  LinearProgress, List, ListItem, ListItemText, CircularProgress,
  Avatar, Button, Paper, Divider
} from '@mui/material';
import { Shield, TrendingUp, Users, Target, BookOpen, ChevronRight } from 'lucide-react';
import './GuildHub.css';

const GuildHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently, user } = useAuth0();
  const [guild, setGuild] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null);
  const [platformUserId, setPlatformUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPlatformUserId(profileRes.data.id);

        const guildRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGuild(guildRes.data);

        const tasksRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/${id}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTasks(tasksRes.data);

        const userMember = guildRes.data.members.find(m => m.user_id === profileRes.data.id);
        if (userMember) setMyRole(userMember.role);

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch guild hub data:", err);
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [id, getAccessTokenSilently, user]);

  if (loading) return <Box className="hub-loader"><CircularProgress sx={{ color: '#00f3ff' }} /></Box>;
  if (!guild) return <Box p={4}><Typography color="error">Guild not found.</Typography></Box>;

  const nextRank = {
    'Apprentice': 'Specialist',
    'Specialist': 'Architect',
    'Architect': 'Mentor',
    'Mentor': 'Master'
  };

  return (
    <Box className="guild-hub-container">
      {/* Header Section */}
      <Box className="hub-header">
        <Box>
          <Typography variant="h2" className="hub-title">{guild.name.toUpperCase()} GUILD</Typography>
          <Box display="flex" gap={2} alignItems="center" mt={1}>
            <Chip label={guild.status.toUpperCase()} className={`status-chip ${guild.status}`} />
            <Typography variant="body1" sx={{ color: '#888', fontFamily: 'Orbitron' }}>
              FOUNDED: {new Date(guild.founded_at).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        <Box textAlign="right">
          <Typography variant="h6" sx={{ color: '#00f3ff', fontFamily: 'Orbitron' }}>MEMBER COUNT</Typography>
          <Typography variant="h3" sx={{ color: '#fff', fontFamily: 'Orbitron' }}>{guild.members.length}</Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column: Intelligence & Members */}
        <Grid item xs={12} md={4}>
          <Card className="hub-card">
            <CardContent>
              <Typography variant="h5" className="card-title">GUILD INTELLIGENCE</Typography>
              <Divider sx={{ mb: 3, bgcolor: '#333' }} />

              <Box mb={4}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption" color="gray">HEALTH SCORE</Typography>
                  <Typography variant="caption" color="#00f3ff">{(Number(guild.intel?.health_score || 0) * 100).toFixed(0)}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={Number(guild.intel?.health_score || 0) * 100} className="hub-progress" />
              </Box>

              <Grid container spacing={2} mb={4}>
                <Grid item xs={6}>
                  <Box className="hub-metric">
                    <Target size={20} color="#00f3ff" />
                    <Typography className="m-value">{(guild.intel?.task_demand * 100 || 0).toFixed(0)}%</Typography>
                    <Typography className="m-label">DEMAND</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box className="hub-metric">
                    <Shield size={20} color="#00f3ff" />
                    <Typography className="m-value">{(guild.intel?.verification_pass_rate * 100 || 100).toFixed(0)}%</Typography>
                    <Typography className="m-label">VERIFIED</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box className="hub-metric">
                    <TrendingUp size={20} color="#00f3ff" />
                    <Typography className="m-value">{guild.intel?.completion_rate ? (guild.intel.completion_rate * 100).toFixed(0) : 0}%</Typography>
                    <Typography className="m-label">THROUGHPUT</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box className="hub-metric">
                    <BookOpen size={20} color="#00f3ff" />
                    <Typography className="m-value">{Math.round(guild.intel?.reward_average || 0)}</Typography>
                    <Typography className="m-label">AVG REWARD</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="h5" className="card-title" sx={{ mt: 4 }}>ACTIVE OPERATIVES</Typography>
              <Divider sx={{ mb: 2, bgcolor: '#333' }} />
              <List>
                {guild.members.map(m => (
                  <ListItem key={m.id} sx={{ px: 0 }}>
                    <Avatar src={m.avatar_url} sx={{ mr: 2, border: '1px solid #00f3ff' }} />
                    <ListItemText
                      primary={m.user_name}
                      secondary={m.role}
                      primaryTypographyProps={{ sx: { color: '#fff', fontFamily: 'Orbitron', fontSize: '0.9rem' } }}
                      secondaryTypographyProps={{ sx: { color: '#00f3ff', fontSize: '0.7rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Mission Board & Progression */}
        <Grid item xs={12} md={8}>
          {myRole && (
            <Card className="hub-card progression-card" sx={{ mb: 4 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h5" className="card-title">MY CAREER PATH</Typography>
                    <Typography variant="h4" sx={{ color: '#00f3ff', fontFamily: 'Orbitron', my: 1 }}>{myRole.toUpperCase()}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="gray">NEXT RANK</Typography>
                    <Typography variant="h6" color="#888">{nextRank[myRole]?.toUpperCase() || 'MAX RANK'}</Typography>
                  </Box>
                </Box>
                <LinearProgress variant="determinate" value={45} className="hub-progress rank-progress" sx={{ mt: 2 }} />
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666', fontStyle: 'italic' }}>
                  Complete 5 more specialized tasks to unlock {nextRank[myRole]} rank.
                </Typography>
              </CardContent>
            </Card>
          )}

          <Typography variant="h4" className="section-title">GUILD MISSION BOARD</Typography>
          <Paper className="mission-paper">
            <List>
              {tasks.length === 0 ? (
                <ListItem><ListItemText primary="No active missions for this guild." sx={{ color: 'gray' }} /></ListItem>
              ) : tasks.map(task => (
                <ListItem
                  key={task.id}
                  className="mission-item"
                  secondaryAction={
                    <Button
                      variant="outlined"
                      className="mission-btn"
                      onClick={() => navigate(`/Visualizer/${task.project_id}/${task.id}`)}
                    >
                      VIEW
                    </Button>
                  }
                >
                  <ListItemText
                    primary={task.name.toUpperCase()}
                    secondary={`PROJECT: ${task.project_name} | REWARD: ${task.reward_tokens} Essence`}
                    primaryTypographyProps={{ className: 'm-name' }}
                    secondaryTypographyProps={{ className: 'm-desc' }}
                  />
                  <Box sx={{ mr: 6 }}>
                    <Chip label={`LVL ${task.skill_level}`} size="small" variant="outlined" sx={{ color: '#ff5ca2', borderColor: '#ff5ca2' }} />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GuildHub;
