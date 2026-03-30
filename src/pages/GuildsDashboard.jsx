import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, LinearProgress, Divider, List, ListItem, ListItemText,
  Modal, TextField, CircularProgress, Paper
} from '@mui/material';
import { Shield, TrendingUp, Users, PlusCircle, CheckCircle } from 'lucide-react';

const GuildsDashboard = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const [guilds, setGuilds] = useState([]);
  const [skillRequests, setSkillRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [platformUserId, setPlatformUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        // Fetch User ID
        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPlatformUserId(profileRes.data.id);

        // Fetch Skills (which have associated guilds)
        const skillsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/skills/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const guildsWithIntel = await Promise.all(skillsRes.data.slice(0, 6).map(async (skill) => {
           try {
             const intelRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/${skill.id}/intelligence`, {
                headers: { Authorization: `Bearer ${token}` }
             });
             return { ...skill, intel: intelRes.data || { health_score: 0.5, task_demand: 0.7, verification_pass_rate: 0.9 } };
           } catch {
             return { ...skill, intel: { health_score: 0.5, task_demand: 0.7, verification_pass_rate: 0.9 } };
           }
        }));

        setGuilds(guildsWithIntel);

        const requestsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/requests`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        setSkillRequests(requestsRes.data || []);

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch guild data:", err);
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [getAccessTokenSilently, user]);

  const handleCreateRequest = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/requests`, {
        requesterId: platformUserId,
        skillName: newSkillName,
        description: newSkillDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequestModalOpen(false);
      alert("Skill request submitted for peer approval.");
    } catch (err) {
      alert("Failed to submit request.");
    }
  };

  const handleVote = async (requestId, approve) => {
     try {
        const token = await getAccessTokenSilently();
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2/requests/${requestId}/vote`, {
            userId: platformUserId,
            approve
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert("Vote recorded.");
     } catch (err) {
        alert("Vote failed.");
     }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box p={4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" sx={{ fontFamily: 'Orbitron', color: '#00f3ff' }}>GUILD INTELLIGENCE</Typography>
        <Button
          variant="outlined"
          startIcon={<PlusCircle />}
          onClick={() => setRequestModalOpen(true)}
          sx={{ color: '#00f3ff', borderColor: '#00f3ff' }}
        >
          REQUEST NEW SKILL
        </Button>
      </Box>

      <Grid container spacing={3}>
        {guilds.map(guild => (
          <Grid item xs={12} md={4} key={guild.id}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" sx={{ fontFamily: 'Orbitron' }}>{guild.name.toUpperCase()}</Typography>
                  <Chip label="ACTIVE" size="small" sx={{ bgcolor: '#004444', color: '#00f3ff' }} />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="gray" gutterBottom>GUILD HEALTH</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(guild.intel?.health_score || 0.5) * 100}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#00f3ff' } }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <TrendingUp size={16} color="#00f3ff" />
                      <Typography variant="caption" display="block">DEMAND</Typography>
                      <Typography variant="h6">{(guild.intel?.task_demand * 100 || 70).toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <Shield size={16} color="#00f3ff" />
                      <Typography variant="caption" display="block">VERIFIED</Typography>
                      <Typography variant="h6">{(guild.intel?.verification_pass_rate * 100 || 95).toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Button fullWidth sx={{ mt: 2, color: '#00f3ff' }}>VIEW CAREER PATH</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={6}>
        <Typography variant="h4" sx={{ fontFamily: 'Orbitron', mb: 3 }}>PENDING SKILL REQUESTS</Typography>
        <Paper sx={{ bgcolor: '#111', border: '1px solid #333' }}>
          <List>
            {skillRequests.length === 0 ? (
                <ListItem><ListItemText primary="No pending requests" /></ListItem>
            ) : skillRequests.map(req => (
              <ListItem key={req.id} divider sx={{ borderColor: '#222' }}>
                <ListItemText
                  primary={req.skill_name}
                  secondary={req.description}
                  primaryTypographyProps={{ color: '#00f3ff', fontFamily: 'Orbitron' }}
                  secondaryTypographyProps={{ color: 'gray' }}
                />
                <Box display="flex" gap={1}>
                  <Button size="small" variant="contained" color="success" onClick={() => handleVote(req.id, true)}>APPROVE</Button>
                  <Button size="small" variant="contained" color="error" onClick={() => handleVote(req.id, false)}>DENY</Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 400, bgcolor: '#1a1a1a', border: '2px solid #00f3ff', boxShadow: 24, p: 4, color: '#fff'
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 2 }}>REQUEST NEW GUILD</Typography>
          <TextField
            fullWidth label="SKILL NAME" sx={{ mb: 2 }}
            value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
            InputLabelProps={{ style: { color: '#00f3ff' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <TextField
            fullWidth label="DESCRIPTION" multiline rows={3} sx={{ mb: 3 }}
            value={newSkillDesc} onChange={(e) => setNewSkillDesc(e.target.value)}
            InputLabelProps={{ style: { color: '#00f3ff' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <Button fullWidth variant="contained" onClick={handleCreateRequest} sx={{ bgcolor: '#00f3ff', color: '#000' }}>SUBMIT TO ORACLE</Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default GuildsDashboard;
