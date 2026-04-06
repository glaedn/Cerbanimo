import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, List, ListItem, ListItemText, Modal, TextField,
  CircularProgress, LinearProgress, Divider, Autocomplete
} from '@mui/material';
import Paper from '@mui/material/Paper';
import { Network, Plus, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConstellationHub = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const navigate = useNavigate();
  const [constellations, setConstellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [taskPoolOpen, setTaskPoolOpen] = useState(false);
  const [currentConstellation, setCurrentConstellation] = useState(null);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [sharedTasks, setSharedTasks] = useState([]);
  const [amendments, setAmendments] = useState([]);
  const [contributionSplits, setContributionSplits] = useState([]);
  const [newConstellation, setNewConstellation] = useState({ name: '', sharedObjective: '', outcomeId: null, initialCommunityId: null });
  const [platformUserId, setPlatformUserId] = useState(null);
  const [userCommunities, setUserCommunities] = useState([]);
  const [allCommunities, setAllCommunities] = useState([]);
  const [eligibleProjects, setEligibleProjects] = useState([]);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [selectedTargetCommunities, setSelectedTargetCommunities] = useState([]);

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

        const communitiesRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${profileRes.data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setUserCommunities(communitiesRes.data || []);

        // Fetch all communities for the dropdown
        const allComRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setAllCommunities(allComRes.data.communities || []);

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
      const payload = {
          ...newConstellation,
          initialProjectId: newConstellation.initialProjectId
      };
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/form`, payload, {
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
          startIcon={<Plus size={20} />}
          onClick={() => setFormModalOpen(true)}
          sx={{ color: '#ff5ca2', borderColor: '#ff5ca2', minWidth: 'fit-content' }}
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
                    <Typography variant="caption" color="#ff5ca2">{(Number(c.health_score || 0) * 100).toFixed(0)}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(c.health_score || 0) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#ff5ca2' } }}
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <TrendingUp size={16} color="#ff5ca2" />
                      <Typography variant="caption" display="block">VELOCITY</Typography>
                      <Typography variant="h6">{Number(c.velocity || 0).toFixed(1)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" p={1} sx={{ bgcolor: '#111', borderRadius: 1 }}>
                      <CheckSquare size={16} color="#ff5ca2" />
                      <Typography variant="caption" display="block">TASKS</Typography>
                      <Typography variant="h6">{(c.tasks_completed || 0)}/{(c.tasks_total || 0)}</Typography>
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

                <Button
                    fullWidth
                    sx={{ mt: 3, color: '#ff5ca2', border: '1px solid #444', '&:hover': { bgcolor: 'rgba(255, 92, 162, 0.1)' } }}
                    onClick={async () => {
                        setCurrentConstellation(c);
                        setInvitesOpen(true);
                    }}
                >
                    INVITE COMMUNITY
                </Button>

                <Button
                    fullWidth
                    sx={{ mt: 1, color: '#00f3ff', border: '1px solid #444', '&:hover': { bgcolor: 'rgba(0, 243, 255, 0.1)' } }}
                    onClick={async () => {
                        setCurrentConstellation(c);
                        const token = await getAccessTokenSilently();

                        const projectsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/projects`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setSharedProjects(projectsRes.data || []);

                        const tasksRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/tasks`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setSharedTasks(tasksRes.data);

                        const amendmentsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/amendments`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setAmendments(amendmentsRes.data || []);

                        const splitsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${c.id}/contribution-splits`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setContributionSplits(splitsRes.data || []);

                        setTaskPoolOpen(true);
                    }}
                >
                    VIEW ALLIANCE CONSOLE
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={taskPoolOpen} onClose={() => setTaskPoolOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '80%', maxWidth: 800, bgcolor: '#0a0a0a', border: '2px solid #ff5ca2', boxShadow: 24, p: 4, color: '#fff',
          maxHeight: '90vh', overflowY: 'auto'
        }}>
          <Typography variant="h4" sx={{ fontFamily: 'Orbitron', mb: 3, color: '#ff5ca2' }}>
            {currentConstellation?.name.toUpperCase()} - ALLIANCE CONSOLE
          </Typography>

          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#ff5ca2' }}>SHARED PROJECTS</Typography>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #333', mb: 4 }}>
            <List>
              {sharedProjects.length === 0 ? (
                <ListItem><ListItemText primary="No shared projects in this alliance." sx={{ color: 'gray' }} /></ListItem>
              ) : sharedProjects.map(project => (
                <ListItem key={project.id} divider sx={{ borderColor: '#222' }}>
                  <ListItemText
                    primary={project.name.toUpperCase()}
                    secondary={project.description}
                    primaryTypographyProps={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}
                    secondaryTypographyProps={{ color: 'gray' }}
                  />
                  <Chip label={project.status.toUpperCase()} size="small" variant="outlined" sx={{ color: '#00f3ff', borderColor: '#00f3ff' }} />
                </ListItem>
              ))}
            </List>
          </Paper>

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
                    primaryTypographyProps={{ color: '#00f3ff', fontFamily: 'Orbitron' }}
                    secondaryTypographyProps={{ color: 'gray' }}
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
                        primaryTypographyProps={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}
                        secondaryTypographyProps={{ color: '#eee' }}
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
                            } catch (err) {
                                alert("Failed to propose amendment.");
                            }
                        }
                    }}
                >
                    PROPOSE NEW OBJECTIVE
                </Button>
            </Box>
          </Paper>

          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#ff5ca2' }}>CONTRIBUTION SPLITS</Typography>
          <Paper sx={{ bgcolor: '#111', border: '1px solid #333', mb: 4 }}>
            <List>
              {contributionSplits.length === 0 ? (
                <ListItem><ListItemText primary="No active contribution split proposals." sx={{ color: 'gray' }} /></ListItem>
              ) : contributionSplits.map(split => (
                <ListItem key={split.id} divider sx={{ borderColor: '#222' }}>
                    <ListItemText
                        primary={`TASK: ${split.task_name.toUpperCase()}`}
                        secondary={`Proposal: ${Object.entries(split.splits).map(([id, p]) => `Community ${id}: ${p}%`).join(', ')}`}
                        primaryTypographyProps={{ color: '#ff5ca2', fontFamily: 'Orbitron' }}
                        secondaryTypographyProps={{ color: '#eee' }}
                    />
                    <Box display="flex" gap={1}>
                        <Button variant="contained" size="small" color="success">CONFIRM</Button>
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
                        const taskId = prompt("ENTER TASK ID:");
                        const splitsStr = prompt("ENTER SPLITS (e.g. {\"1\": 50, \"2\": 50}):");
                        if (taskId && splitsStr) {
                            try {
                                const token = await getAccessTokenSilently();
                                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${currentConstellation.id}/contribution-splits`, {
                                    taskId: parseInt(taskId),
                                    proposerId: platformUserId,
                                    splits: JSON.parse(splitsStr)
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                alert("Split proposed.");
                            } catch (err) {
                                alert("Failed to propose split.");
                            }
                        }
                    }}
                >
                    PROPOSE NEW SPLIT
                </Button>
            </Box>
          </Paper>

          <Button fullWidth variant="outlined" onClick={() => setTaskPoolOpen(false)} sx={{ color: 'gray', borderColor: 'gray' }}>CLOSE CONSOLE</Button>
        </Box>
      </Modal>

      <Modal open={invitesOpen} onClose={() => setInvitesOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 400, bgcolor: '#1a1a1a', border: '2px solid #ff5ca2', boxShadow: 24, p: 4, color: '#fff'
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 3 }}>INVITE COMMUNITY TO ALLIANCE</Typography>

          <Autocomplete
            options={userCommunities}
            getOptionLabel={(option) => option.name}
            onChange={(event, newValue) => {
              setNewConstellation({...newConstellation, initialCommunityId: newValue?.id || null});
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="YOUR COMMUNITY (INVITER)"
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#ff5ca2' } }}
              />
            )}
            sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#ff5ca2' },
                  '&.Mui-focused fieldset': { borderColor: '#ff5ca2' },
                },
                '& .MuiInputBase-input': { color: '#fff' }
            }}
          />

          <Autocomplete
            multiple
            options={allCommunities}
            getOptionLabel={(option) => option.name}
            onChange={(event, newValue) => {
              setSelectedTargetCommunities(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="TARGET COMMUNITIES (INVITEES)"
                sx={{ mb: 3 }}
                InputLabelProps={{ style: { color: '#ff5ca2' } }}
              />
            )}
            sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#ff5ca2' },
                  '&.Mui-focused fieldset': { borderColor: '#ff5ca2' },
                },
                '& .MuiInputBase-input': { color: '#fff' }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: '#ff5ca2', color: '#000', '&:hover': { bgcolor: '#ff89bc' } }}
            disabled={!newConstellation.initialCommunityId || selectedTargetCommunities.length === 0}
            onClick={async () => {
              try {
                  const token = await getAccessTokenSilently();
                  await axios.post(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/${currentConstellation.id}/invites`, {
                      inviterId: newConstellation.initialCommunityId,
                      inviteeIds: selectedTargetCommunities.map(c => c.id)
                  }, { headers: { Authorization: `Bearer ${token}` } });
                  alert("Alliance invites sent.");
                  setInvitesOpen(false);
              } catch (err) { alert("Failed to send invites."); }
          }}>SEND ALLIANCE PROPOSAL</Button>
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
            InputLabelProps={{ style: { color: '#ff5ca2' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <Autocomplete
            options={userCommunities}
            getOptionLabel={(option) => option.name}
            onChange={async (event, newValue) => {
              setNewConstellation({...newConstellation, initialCommunityId: newValue?.id || null});
              const token = await getAccessTokenSilently();
              const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/constellations_v2/eligible-projects`, {
                  params: { communityId: newValue?.id, userId: platformUserId },
                  headers: { Authorization: `Bearer ${token}` }
              });
              setEligibleProjects(res.data || []);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="CREATING ENTITY (COMMUNITY OR SELF)"
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#ff5ca2' } }}
              />
            )}
            sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#ff5ca2' },
                  '&.Mui-focused fieldset': { borderColor: '#ff5ca2' },
                },
                '& .MuiInputBase-input': { color: '#fff' }
            }}
          />

          <Autocomplete
            options={eligibleProjects}
            getOptionLabel={(option) => option.name}
            onChange={(event, newValue) => {
              setNewConstellation({...newConstellation, initialProjectId: newValue?.id || null});
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="LINK INITIAL PROJECT"
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#ff5ca2' } }}
              />
            )}
            sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#ff5ca2' },
                  '&.Mui-focused fieldset': { borderColor: '#ff5ca2' },
                },
                '& .MuiInputBase-input': { color: '#fff' }
            }}
          />

          <TextField
            fullWidth label="SHARED OBJECTIVE" multiline rows={4} sx={{ mb: 3 }}
            value={newConstellation.sharedObjective} onChange={(e) => setNewConstellation({...newConstellation, sharedObjective: e.target.value})}
            placeholder="What is the unified goal of this multi-entity alliance?"
            InputLabelProps={{ style: { color: '#ff5ca2' } }}
            inputProps={{ style: { color: '#fff' } }}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={handleFormSubmit}
            sx={{ bgcolor: '#ff5ca2', color: '#000', '&:hover': { bgcolor: '#ff89bc' } }}
            disabled={!newConstellation.initialProjectId}
          >
            IGNITE ALLIANCE
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default ConstellationHub;
