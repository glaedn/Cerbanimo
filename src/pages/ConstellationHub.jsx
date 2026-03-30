import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, List, ListItem, ListItemText, Modal, TextField,
  CircularProgress, LinearProgress, Divider
} from '@mui/material';
import { Network, Plus, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConstellationHub = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const navigate = useNavigate();
  const [constellations, setConstellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [newConstellation, setNewConstellation] = useState({ name: '', sharedObjective: '', outcomeId: null });
  const [platformUserId, setPlatformUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();

        // Fetch user ID
        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setPlatformUserId(profileRes.data.id);

        const constellationsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConstellations(constellationsRes.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch constellation data:", err);
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [getAccessTokenSilently, user]);

  const handleFormSubmit = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/form`, newConstellation, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormModalOpen(false);
      setConstellations([...constellations, response.data]);
      alert("Constellation formed successfully.");
    } catch (err) {
      alert("Failed to form constellation.");
    }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box p={4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" sx={{ fontFamily: 'Orbitron', color: '#ff5ca2' }}>CONSTELLATION HUB</Typography>
        <Button
          variant="outlined"
          startIcon={<Plus />}
          onClick={() => setFormModalOpen(true)}
          sx={{ color: '#ff5ca2', borderColor: '#ff5ca2' }}
        >
          FORM ALLIANCE
        </Button>
      </Box>

      <Grid container spacing={4}>
        {constellations.length === 0 ? (
            <Grid item xs={12}>
                <Typography color="gray">No active constellations found. Form an alliance between projects and guilds to begin complex work.</Typography>
            </Grid>
        ) : constellations.map(c => (
          <Grid item xs={12} md={6} key={c.id}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff', '&:hover': { borderColor: '#ff5ca2' } }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#ff5ca2' }}>{c.name.toUpperCase()}</Typography>
                  <Chip label={c.status.toUpperCase()} size="small" sx={{ bgcolor: '#440022', color: '#ff5ca2' }} />
                </Box>

                <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: 'gray' }}>"{c.shared_objective}"</Typography>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" color="gray">CONSTELLATION HEALTH</Typography>
                    <Typography variant="caption" color="#ff5ca2">{(c.health_score * 100 || 85).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(c.health_score || 0.85) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#ff5ca2' } }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <TrendingUp size={16} color="#ff5ca2" />
                      <Typography variant="caption" display="block">VELOCITY</Typography>
                      <Typography variant="h6">{(c.velocity || 12).toFixed(1)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <CheckSquare size={16} color="#ff5ca2" />
                      <Typography variant="caption" display="block">TASKS</Typography>
                      <Typography variant="h6">{(c.tasks_completed || 8)}/{(c.tasks_total || 20)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <AlertTriangle size={16} color="#ff5ca2" />
                      <Typography variant="caption" display="block">DRIFT</Typography>
                      <Typography variant="h6">LOW</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Button fullWidth sx={{ mt: 3, color: '#ff5ca2', border: '1px solid #444', '&:hover': { bgcolor: 'rgba(255, 92, 162, 0.1)' } }}>VIEW SHARED TASK POOL</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={formModalOpen} onClose={() => setFormModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 500, bgcolor: '#1a1a1a', border: '2px solid #ff5ca2', boxShadow: 24, p: 4, color: '#fff'
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 3 }}>FORM NEW CONSTELLATION</Typography>
          <TextField
            fullWidth label="CONSTELLATION NAME" sx={{ mb: 2 }}
            value={newConstellation.name} onChange={(e) => setNewConstellation({...newConstellation, name: e.target.value})}
            InputLabelProps={{ style: { color: '#ff5ca2' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <TextField
            fullWidth label="SHARED OBJECTIVE" multiline rows={4} sx={{ mb: 3 }}
            value={newConstellation.sharedObjective} onChange={(e) => setNewConstellation({...newConstellation, sharedObjective: e.target.value})}
            placeholder="What is the unified goal of this multi-entity alliance?"
            InputLabelProps={{ style: { color: '#ff5ca2' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <Button fullWidth variant="contained" onClick={handleFormSubmit} sx={{ bgcolor: '#ff5ca2', color: '#000', '&:hover': { bgcolor: '#ff89bc' } }}>IGNITE ALLIANCE</Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default ConstellationHub;
