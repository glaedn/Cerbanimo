import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Chip,
  Button, List, ListItem, ListItemText, Modal, TextField,
  CircularProgress, LinearProgress, Paper
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { Plus, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';

const ConstellationHub = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const [constellations, setConstellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [taskPoolOpen, setTaskPoolOpen] = useState(false);
  const [currentConstellation, setCurrentConstellation] = useState(null);
  const [sharedTasks, setSharedTasks] = useState([]);
  const [amendments, setAmendments] = useState([]);
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

  // Fix for global SVG icon size issue (Lucide icons)
  useEffectFix(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .lucide, .lucide * {
        height: 1em !important;
        width: 1em !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: none !important;
        max-height: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleFormSubmit = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/form`, newConstellation, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormModalOpen(false);
      setConstellations([...constellations, response.data]);
      alert("Constellation formed successfully.");
    } catch {
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
          startIcon={<Plus size={20} />}
          onClick={() => setFormModalOpen(true)}
          sx={{ color: '#ff5ca2', borderColor: '#ff5ca2', minWidth: 'fit-content' }}
        >
          FORM ALLIANCE
        </Button>
      </Box>

      <Grid2 container spacing={4}>
        {constellations.length === 0 ? (
            <Grid2 xs={12}>
                <Typography color="gray">No active constellations found. Form an alliance between projects and guilds to begin complex work.</Typography>
            </Grid2>
        ) : constellations.map(c => (
          <Grid2 xs={12} md={6} key={c.id}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff', '&:hover': { borderColor: '#ff5ca2' } }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#ff5ca2' }}>{c.name.toUpperCase()}</Typography>
                  <Chip label={c.status.toUpperCase()} size="small" sx={{ bgcolor: '#440022', color: '#ff5ca2' }} />
                </Box>

                <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: 'gray' }}>&quot;{c.shared_objective}&quot;</Typography>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" color="gray">CONSTELLATION HEALTH</Typography>
                    <Typography variant="caption" color="#ff5ca2">{(Number(c.health_score || 0.85) * 100).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(c.health_score || 0.85) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#ff5ca2' } }}
                  />
                </Box>

                <Grid2 container spacing={2}>
                  <Grid2 xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <TrendingUp size={20} color="#ff5ca2" style={{ verticalAlign: 'middle' }} />
                      <Typography variant="caption" display="block">VELOCITY</Typography>
                      <Typography variant="h6">{Number(c.velocity || 12).toFixed(1)}</Typography>
                    </Box>
                  </Grid2>
                  <Grid2 xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <CheckSquare size={20} color="#ff5ca2" style={{ verticalAlign: 'middle' }} />
                      <Typography variant="caption" display="block">TASKS</Typography>
                      <Typography variant="h6">{(c.tasks_completed || 8)}/{(c.tasks_total || 20)}</Typography>
                    </Box>
                  </Grid2>
                  <Grid2 xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <AlertTriangle size={20} color="#ff5ca2" style={{ verticalAlign: 'middle' }} />
                      <Typography variant="caption" display="block">DRIFT</Typography>
                      <Typography variant="h6">LOW</Typography>
                    </Box>
                  </Grid2>
                </Grid2>

                <Button
                    fullWidth
                    sx={{ mt: 3, color: '#ff5ca2', border: '1px solid #444', '&:hover': { bgcolor: 'rgba(255, 92, 162, 0.1)' } }}
                    onClick={async () => {
                        setCurrentConstellation(c);
                        const token = await getAccessTokenSilently();
                        const tasksRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/tasks`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setSharedTasks(tasksRes.data);

                        const amendmentsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/amendments`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setAmendments(amendmentsRes.data);

                        setTaskPoolOpen(true);
                    }}
                >
                    VIEW ALLIANCE CONSOLE
                </Button>
              </CardContent>
            </Card>
          </Grid2>
        ))}
      </Grid2>

      <Modal open={taskPoolOpen} onClose={() => setTaskPoolOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '80%', maxWidth: 800, bgcolor: '#0a0a0a', border: '2px solid #ff5ca2', boxShadow: 24, p: 4, color: '#fff',
          maxHeight: '90vh', overflowY: 'auto'
        }}>
          <Typography variant="h4" sx={{ fontFamily: 'Orbitron', mb: 3, color: '#ff5ca2' }}>
            {currentConstellation?.name.toUpperCase()} - ALLIANCE CONSOLE
          </Typography>

          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#ff5ca2' }}>SHARED TASK POOL</Typography>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #333', mb: 4 }}>
            <List>
              {sharedTasks.length === 0 ? (
                <ListItem><ListItemText primary="No shared tasks in this alliance pool." sx={{ color: 'gray' }} /></ListItem>
              ) : sharedTasks.map(task => (
                <ListItem key={task.id} divider sx={{ borderColor: '#222' }}>
                  <ListItemText
                    primary={task.name.toUpperCase()}
                    secondary={`Project: ${task.project_name} | Status: ${task.status}`}
                    slotProps={{
                      primary: { style: { color: '#00f3ff', fontFamily: 'Orbitron' } },
                      secondary: { style: { color: 'gray' } }
                    }}
                  />
                  <Button variant="outlined" size="small" sx={{ color: '#00f3ff', borderColor: '#00f3ff' }}>VIEW TASK</Button>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#ff5ca2' }}>OBJECTIVE AMENDMENTS</Typography>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #333', mb: 4 }}>
            <List>
              {amendments.length === 0 ? (
                <ListItem><ListItemText primary="No active objective amendments." sx={{ color: 'gray' }} /></ListItem>
              ) : amendments.map(amendment => (
                <ListItem key={amendment.id} divider sx={{ borderColor: '#222' }}>
                    <ListItemText
                        primary="AMENDMENT PROPOSAL"
                        secondary={`New Objective: ${amendment.new_objective}`}
                        slotProps={{
                          primary: { style: { color: '#ff5ca2', fontFamily: 'Orbitron' } },
                          secondary: { style: { color: '#eee' } }
                        }}
                    />
                    <Box display="flex" gap={1}>
                        <Button variant="contained" size="small" color="success" onClick={async () => {
                             const token = await getAccessTokenSilently();
                             await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/amendments/${amendment.id}/vote`, {
                                voterId: platformUserId,
                                rankings: ['approve', 'reject']
                             }, { headers: { Authorization: `Bearer ${token}` } });
                             alert("Vote cast.");
                        }}>VOTE FOR</Button>
                    </Box>
                </ListItem>
              ))}
            </List>
            <Box p={2}>
                <Button
                    variant="outlined"
                    fullWidth
                    sx={{ color: '#ff5ca2', borderColor: '#ff5ca2' }}
                    onClick={async () => {
                        const newObj = prompt("ENTER NEW SHARED OBJECTIVE:");
                        if (newObj) {
                            try {
                                const token = await getAccessTokenSilently();
                                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${currentConstellation.id}/amendments`, {
                                    proposerId: platformUserId,
                                    oldObjective: currentConstellation.shared_objective,
                                    newObjective: newObj
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                alert("Amendment proposed.");
                            } catch {
                                alert("Failed to propose amendment.");
                            }
                        }
                    }}
                >
                    PROPOSE NEW OBJECTIVE
                </Button>
            </Box>
          </Paper>

          <Button fullWidth variant="outlined" onClick={() => setTaskPoolOpen(false)} sx={{ color: 'gray', borderColor: 'gray' }}>CLOSE CONSOLE</Button>
        </Box>
      </Modal>

      <Modal open={formModalOpen} onClose={() => setFormModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 500, bgcolor: '#1a1a1a', border: '2px solid #ff5ca2', boxShadow: 24, p: 4, color: '#fff'
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 3 }}>FORM NEW CONSTELLATION</Typography>
          <TextField
            fullWidth label="CONSTELLATION NAME" sx={{ mb: 2 }}
            value={newConstellation.name} onChange={(e) => setNewConstellation({...newConstellation, name: e.target.value})}
            slotProps={{
              inputLabel: { style: { color: '#ff5ca2' } },
              input: { style: { color: '#fff' } }
            }}
          />
          <TextField
            fullWidth label="SHARED OBJECTIVE" multiline rows={4} sx={{ mb: 3 }}
            value={newConstellation.sharedObjective} onChange={(e) => setNewConstellation({...newConstellation, sharedObjective: e.target.value})}
            placeholder="What is the unified goal of this multi-entity alliance?"
            slotProps={{
              inputLabel: { style: { color: '#ff5ca2' } },
              input: { style: { color: '#fff' } }
            }}
          />
          <Button fullWidth variant="contained" onClick={handleFormSubmit} sx={{ bgcolor: '#ff5ca2', color: '#000', '&:hover': { bgcolor: '#ff89bc' } }}>IGNITE ALLIANCE</Button>
        </Box>
      </Modal>
    </Box>
  );
};

// Fix for global SVG icon size issue (Lucide icons)
import { useEffect as useEffectFix } from 'react';

export default ConstellationHub;
