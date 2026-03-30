import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, LinearProgress, List, ListItem, ListItemText,
  Modal, TextField, CircularProgress, Paper
} from '@mui/material';
import { Shield, TrendingUp, Users, PlusCircle } from 'lucide-react';
import './GuildsDashboard.css';

const GuildsDashboard = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const [guilds, setGuilds] = useState([]);
  const [skillRequests, setSkillRequests] = useState([]);
  const [activeDisputes, setActiveDisputes] = useState([]);
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

        const guildsWithIntel = await Promise.all(skillsRes.data.map(async (skill) => {
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

        const disputesRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/active`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        setActiveDisputes(disputesRes.data || []);

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
      setNewSkillName('');
      setNewSkillDesc('');
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

  const handleDisputeVote = async (disputeId, vote) => {
    try {
       const token = await getAccessTokenSilently();
       await axios.post(`${import.meta.env.VITE_BACKEND_URL}/verification_v2/disputes/${disputeId}/votes`, {
           voterId: platformUserId,
           vote
       }, {
           headers: { Authorization: `Bearer ${token}` }
       });
       alert("Dispute vote recorded.");
    } catch (err) {
       alert("Dispute vote failed.");
    }
  };

  if (loading) return <Box p={4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress sx={{ color: '#00f3ff' }} /></Box>;

  return (
    <Box className="guilds-dashboard-container">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Typography variant="h3" className="guilds-title">GUILD INTELLIGENCE</Typography>
        <Button
          variant="outlined"
          startIcon={<PlusCircle />}
          onClick={() => setRequestModalOpen(true)}
          className="cyber-button-guild"
        >
          REQUEST NEW SKILL
        </Button>
      </Box>

      <Grid container spacing={4}>
        {guilds.map(guild => (
          <Grid item xs={12} sm={6} md={4} key={guild.id}>
            <Card className="cyber-card">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" className="guild-name">{guild.name}</Typography>
                  <Chip label="ACTIVE" size="small" className="guild-status-chip" />
                </Box>

                <Typography variant="body2" color="gray" sx={{ mb: 2, height: '40px', overflow: 'hidden' }}>
                    {guild.description || "Advancing the frontier of " + guild.name}
                </Typography>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" sx={{ color: '#888', fontFamily: 'Orbitron' }}>GUILD HEALTH</Typography>
                    <Typography variant="caption" sx={{ color: '#00f3ff', fontFamily: 'Orbitron' }}>{(guild.intel?.health_score * 100 || 50).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(guild.intel?.health_score || 0.5) * 100}
                    className="health-bar"
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box className="metric-box">
                      <TrendingUp size={16} color="#00f3ff" />
                      <Typography className="metric-value">{(guild.intel?.task_demand * 100 || 70).toFixed(0)}%</Typography>
                      <Typography className="metric-label">DEMAND</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box className="metric-box">
                      <Shield size={16} color="#00f3ff" />
                      <Typography className="metric-value">{(guild.intel?.verification_pass_rate * 100 || 95).toFixed(0)}%</Typography>
                      <Typography className="metric-label">VERIFIED</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Button fullWidth className="cyber-button-guild">ENTER HUB</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box className="pending-requests-section">
        <Typography variant="h4" className="section-title">ACTIVE DISPUTES (QUORUM REQUIRED)</Typography>
        <Paper className="cyber-paper" sx={{ mb: 6 }}>
          <List>
            {activeDisputes.length === 0 ? (
                <ListItem><ListItemText primary="No active disputes detected." sx={{ color: 'gray', fontStyle: 'italic' }} /></ListItem>
            ) : activeDisputes.map(dispute => (
              <ListItem key={dispute.id} className="request-item">
                <ListItemText
                  primary={`TASK: ${dispute.task_name.toUpperCase()}`}
                  secondary={`REASON: ${dispute.reason}`}
                  primaryTypographyProps={{ className: 'request-name' }}
                  secondaryTypographyProps={{ className: 'request-desc' }}
                />
                <Box display="flex" gap={2}>
                  <Button className="vote-button-approve" onClick={() => handleDisputeVote(dispute.id, 'uphold')}>UPHOLD</Button>
                  <Button className="vote-button-deny" onClick={() => handleDisputeVote(dispute.id, 'overturn')}>OVERTURN</Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Typography variant="h4" className="section-title">PENDING SKILL REQUESTS</Typography>
        <Paper className="cyber-paper">
          <List>
            {skillRequests.length === 0 ? (
                <ListItem><ListItemText primary="No pending requests detected in the datacore." sx={{ color: 'gray', fontStyle: 'italic' }} /></ListItem>
            ) : skillRequests.map(req => (
              <ListItem key={req.id} className="request-item">
                <ListItemText
                  primary={req.skill_name.toUpperCase()}
                  secondary={req.description}
                  primaryTypographyProps={{ className: 'request-name' }}
                  secondaryTypographyProps={{ className: 'request-desc' }}
                />
                <Box display="flex" gap={2}>
                  <Button className="vote-button-approve" onClick={() => handleVote(req.id, true)}>APPROVE</Button>
                  <Button className="vote-button-deny" onClick={() => handleVote(req.id, false)}>DENY</Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      <Modal open={requestModalOpen} onClose={() => setRequestModalOpen(false)}>
        <Box className="guild-modal" sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 450
        }}>
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mb: 3, color: '#00f3ff' }}>REQUEST NEW GUILD</Typography>
          <TextField
            fullWidth label="SKILL PROTOCOL NAME" className="cyber-textfield" sx={{ mb: 3 }}
            value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)}
          />
          <TextField
            fullWidth label="MISSION DESCRIPTION" multiline rows={4} className="cyber-textfield" sx={{ mb: 4 }}
            value={newSkillDesc} onChange={(e) => setNewSkillDesc(e.target.value)}
          />
          <Button fullWidth variant="contained" onClick={handleCreateRequest} sx={{ bgcolor: '#00f3ff', color: '#000', fontFamily: 'Orbitron', fontWeight: 'bold', '&:hover': { bgcolor: '#00d0db' } }}>
            INITIATE PROPOSAL
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default GuildsDashboard;
