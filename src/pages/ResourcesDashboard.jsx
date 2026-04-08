import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, List, ListItem, ListItemText, Modal, TextField,
  CircularProgress, Divider, Paper, Tabs, Tab
} from '@mui/material';
import { Box as BoxIcon, Calendar, Wrench, MapPin, Plus, Search, Book } from 'lucide-react';
import ResourceListingForm from '../components/ResourceListingForm/ResourceListingForm';
import { useIsMobile } from '../hooks/useIsMobile';

const ResourcesDashboard = () => {
  const isMobile = useIsMobile();
  const { getAccessTokenSilently, user } = useAuth0();
  const [resources, setResources] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [platformUserId, setPlatformUserId] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [bookingForm, setBookingForm] = useState({ taskId: '', startTime: '', endTime: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const profileRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const userId = profileRes.data.id;
        setPlatformUserId(userId);

        const resourcesRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/inventory/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResources(resourcesRes.data || []);

        const catalogRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/catalog`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setCatalog(catalogRes.data || []);

        const scheduleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/schedule/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setAllocations(scheduleRes.data || []);

        const tasksRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/accepted`, {
            params: { userId },
            headers: { Authorization: `Bearer ${token}` }
        });
        setAssignedTasks(tasksRes.data || []);

        const conflictsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/conflicts/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setConflicts(conflictsRes.data || []);

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch resource data:", err);
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [getAccessTokenSilently, user]);

  const handleResourceSubmit = async (resourceData) => {
    try {
      const token = await getAccessTokenSilently();
      const payload = { ...resourceData, ownerUserId: platformUserId };
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/add`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);

      // Refresh inventory
      const resourcesRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/inventory/${platformUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResources(resourcesRes.data || []);

      alert("Resource listed successfully.");
    } catch (err) {
      alert("Failed to process resource.");
    }
  };

  const handleBookingSubmit = async () => {
      try {
          if (window.navigator.vibrate) window.navigator.vibrate(50);
          const token = await getAccessTokenSilently();
          const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/allocate`, {
              ...bookingForm,
              resourceId: selectedResource.id,
              userId: platformUserId
          }, { headers: { Authorization: `Bearer ${token}` } });

          if (window.navigator.vibrate) window.navigator.vibrate([30, 30, 30]);
          alert(`Booking successful. ${response.data.conflictCount > 0 ? `Detected ${response.data.conflictCount} overlaps requiring resolution.` : ''}`);
          setIsBookingOpen(false);

          // Refresh schedule
          const scheduleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/schedule/${platformUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAllocations(scheduleRes.data || []);
      } catch (err) {
          alert("Failed to book resource.");
      }
  };

  const handleResolveConflict = async (winningAllocationId) => {
      const resolutionText = prompt("REASON FOR SELECTION:");
      if (!resolutionText) return;

      try {
          if (window.navigator.vibrate) window.navigator.vibrate(50);
          const token = await getAccessTokenSilently();
          await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/conflicts/${selectedConflict.id}/resolve`, {
              winningAllocationId,
              resolutionText
          }, { headers: { Authorization: `Bearer ${token}` } });

          if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
          alert("Conflict resolved.");
          setIsConflictOpen(false);

          // Refresh data
          const scheduleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/schedule/${platformUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAllocations(scheduleRes.data || []);
          const conflictsRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/conflicts/${platformUserId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setConflicts(conflictsRes.data || []);
      } catch (err) {
          alert("Failed to resolve conflict.");
      }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box p={isMobile ? 2 : 4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', pb: isMobile ? 12 : 4 }}>
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} mb={4} gap={2}>
        <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontFamily: 'Orbitron', color: '#00d787', textAlign: isMobile ? 'center' : 'left' }}>RESOURCE INVENTORY</Typography>
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
            <TextField
                size="small"
                placeholder="Search catalog..."
                fullWidth={isMobile}
                InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8, color: '#666' }} /> }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ bgcolor: '#111', borderRadius: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#333' } } }}
            />
            <Button
                variant="outlined"
                startIcon={<Plus />}
                onClick={() => setIsModalOpen(true)}
                sx={{ color: '#00d787', borderColor: '#00d787', height: isMobile ? '48px' : 'auto' }}
            >
                LIST NEW RESOURCE
            </Button>
        </Box>
      </Box>

      {conflicts.length > 0 && (
          <Box mb={4} p={2} sx={{ bgcolor: 'rgba(255, 50, 50, 0.1)', border: '1px solid #ff3232', borderRadius: 1, cursor: 'pointer' }} onClick={() => setIsConflictOpen(true)}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} color="#ff3232" gutterBottom sx={{ fontFamily: 'Orbitron' }}>BOOKING CONFLICTS DETECTED</Typography>
              <Typography variant="body2" color="#ff8888">You have {conflicts.length} overlapping resource requests that require resolution. Click to manage.</Typography>
          </Box>
      )}

      {isMobile && (
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            mb: 3,
            bgcolor: '#111',
            '& .MuiTabs-indicator': { bgcolor: '#00d787' },
            '& .MuiTab-root': { color: '#666', fontFamily: 'Orbitron', '&.Mui-selected': { color: '#00d787' } }
          }}
        >
          <Tab label="CATALOG" />
          <Tab label="ASSETS" />
          <Tab label="SCHEDULE" />
        </Tabs>
      )}

      <Grid container spacing={isMobile ? 2 : 4}>
        <Grid item xs={12} md={8}>
          {(!isMobile || tabValue === 0) && (
            <Box mb={isMobile ? 0 : 6}>
              <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#00d787' }}>GLOBAL CATALOG</Typography>
              <Grid container spacing={2}>
                {catalog.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map(r => (
                  <Grid item xs={12} sm={6} key={r.id}>
                    <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff', '&:hover': { borderColor: '#00d787' } }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{r.name}</Typography>
                          <Chip label={r.status.toUpperCase()} size="small" sx={{ bgcolor: '#003311', color: '#00d787' }} />
                        </Box>
                        <Typography variant="body2" color="gray" sx={{ mb: 2 }}>{r.description}</Typography>

                        <Grid container spacing={1} mb={2}>
                            <Grid item xs={6}><Box display="flex" alignItems="center" gap={1}><BoxIcon size={14} /> <Typography variant="caption">{r.category}</Typography></Box></Grid>
                            <Grid item xs={6}><Box display="flex" alignItems="center" gap={1}><Wrench size={14} /> <Typography variant="caption">{r.condition}</Typography></Box></Grid>
                            <Grid item xs={12}><Box display="flex" alignItems="center" gap={1}><MapPin size={14} /> <Typography variant="caption">{r.location_text || 'Remote'}</Typography></Box></Grid>
                        </Grid>

                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Book size={16} />}
                            disabled={r.owner_user_id === platformUserId}
                            onClick={() => { setSelectedResource(r); setIsBookingOpen(true); }}
                            sx={{ bgcolor: '#00d787', color: '#000', height: isMobile ? '48px' : 'auto', '&:hover': { bgcolor: '#00b572' } }}
                        >
                            {r.owner_user_id === platformUserId ? 'OWNED' : 'RESERVE'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {(!isMobile || tabValue === 1) && (
            <Box>
              <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mt: isMobile ? 0 : 6, mb: 2, color: '#00d787' }}>YOUR ASSETS</Typography>
              <Grid container spacing={2}>
                {resources.length === 0 ? (
                    <Grid item xs={12}><Typography color="gray">No resources listed in your inventory.</Typography></Grid>
                ) : resources.map(r => (
                  <Grid item xs={12} sm={6} key={r.id}>
                    <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>{r.name}</Typography>
                          <Chip label={r.status.toUpperCase()} size="small" sx={{ bgcolor: '#003311', color: '#00d787' }} />
                        </Box>
                        <Typography variant="body2" color="gray">{r.description}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Grid>

        {(!isMobile || tabValue === 2) && (
          <Grid item xs={12} md={4}>
            <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#00d787' }}>BOOKING SCHEDULE</Typography>
            <Paper sx={{ bgcolor: '#111', p: 2, border: '1px solid #333' }}>
              <List>
                {allocations.length === 0 ? (
                    <ListItem><ListItemText primary="No bookings found." sx={{ color: 'gray' }} /></ListItem>
                ) : allocations.map(a => (
                  <ListItem key={a.id} divider sx={{ borderColor: '#222', px: 0 }}>
                    <ListItemText
                      primary={a.resource_name}
                      secondary={`${a.task_name || 'Coordination'} | ${new Date(a.start_time).toLocaleString()}`}
                      primaryTypographyProps={{ color: '#00d787', sx: { fontSize: isMobile ? '0.9rem' : '1rem' } }}
                      secondaryTypographyProps={{ color: 'gray', sx: { fontSize: isMobile ? '0.75rem' : '0.875rem' } }}
                    />
                    <Chip label={a.status} size="small" variant="outlined" sx={{ color: '#aaa', borderColor: '#444' }} />
                  </ListItem>
                ))}
              </List>
              <Button fullWidth sx={{ mt: 2, color: '#00d787', height: isMobile ? '48px' : 'auto' }} startIcon={<Calendar size={16} />}>VIEW FULL CALENDAR</Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Modal open={isConflictOpen} onClose={() => setIsConflictOpen(false)}>
          <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: isMobile ? '100%' : 600, height: isMobile ? '100%' : 'auto', bgcolor: '#0a0a0a', border: isMobile ? 'none' : '2px solid #ff3232', p: isMobile ? 2 : 4, borderRadius: isMobile ? 0 : 2,
              maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto'
          }}>
              <Typography variant="h5" color="#ff3232" gutterBottom sx={{ fontFamily: 'Orbitron' }}>CONFLICT RESOLUTION PROTOCOL</Typography>
              <Typography variant="body2" color="gray" sx={{ mb: 3 }}>Multiple operatives have reserved overlapping time slots for the same resource. Select the allocation that should proceed.</Typography>

              <List>
                  {conflicts.map(c => (
                      <Paper key={c.id} sx={{ bgcolor: '#111', p: 2, mb: 2, border: '1px solid #333' }}>
                          <Typography variant="subtitle1" color="#ff3232" sx={{ fontFamily: 'Orbitron', mb: 2 }}>{c.resource_name.toUpperCase()}</Typography>

                          <Grid container spacing={2}>
                              <Grid item xs={6}>
                                  <Box p={1} sx={{ bgcolor: 'rgba(0, 215, 135, 0.05)', border: '1px solid #222' }}>
                                      <Typography variant="caption" color="gray">OPTION A</Typography>
                                      <Typography variant="body1">{new Date(c.start_1).toLocaleString()}</Typography>
                                      <Button size="small" variant="contained" sx={{ mt: 1, bgcolor: '#00d787', color: '#000' }} onClick={() => { setSelectedConflict(c); handleResolveConflict(c.allocation_id_1); }}>APPROVE A</Button>
                                  </Box>
                              </Grid>
                              <Grid item xs={6}>
                                  <Box p={1} sx={{ bgcolor: 'rgba(0, 215, 135, 0.05)', border: '1px solid #222' }}>
                                      <Typography variant="caption" color="gray">OPTION B</Typography>
                                      <Typography variant="body1">{new Date(c.start_2).toLocaleString()}</Typography>
                                      <Button size="small" variant="contained" sx={{ mt: 1, bgcolor: '#00d787', color: '#000' }} onClick={() => { setSelectedConflict(c); handleResolveConflict(c.allocation_id_2); }}>APPROVE B</Button>
                                  </Box>
                              </Grid>
                          </Grid>
                      </Paper>
                  ))}
              </List>

              <Button fullWidth onClick={() => setIsConflictOpen(false)} sx={{ mt: 2, color: 'gray' }}>CLOSE PROTOCOL</Button>
          </Box>
      </Modal>

      <Modal open={isBookingOpen} onClose={() => setIsBookingOpen(false)}>
          <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: isMobile ? '100%' : 400, height: isMobile ? '100%' : 'auto', bgcolor: '#1a1a1a', border: isMobile ? 'none' : '2px solid #00d787', p: isMobile ? 3 : 4, borderRadius: isMobile ? 0 : 2
          }}>
              <Typography variant="h6" color="#00d787" gutterBottom sx={{ fontFamily: 'Orbitron' }}>RESERVE {selectedResource?.name.toUpperCase()}</Typography>

              <TextField
                  select
                  fullWidth
                  label="ASSIGNED TASK"
                  value={bookingForm.taskId}
                  onChange={(e) => setBookingForm({ ...bookingForm, taskId: e.target.value })}
                  sx={{ mb: 2, mt: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' } } }}
                  InputLabelProps={{ style: { color: '#00d787' } }}
                  SelectProps={{ native: true }}
              >
                  <option value="" disabled></option>
                  {assignedTasks.map(t => (
                      <option key={t.task_id} value={t.task_id}>{t.name}</option>
                  ))}
              </TextField>

              <TextField
                  fullWidth
                  type="datetime-local"
                  label="START TIME"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                  InputLabelProps={{ shrink: true, style: { color: '#00d787' } }}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' } } }}
              />

              <TextField
                  fullWidth
                  type="datetime-local"
                  label="END TIME"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true, style: { color: '#00d787' } }}
                  sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' } } }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleBookingSubmit}
                disabled={!bookingForm.taskId || !bookingForm.startTime || !bookingForm.endTime}
                sx={{ bgcolor: '#00d787', color: '#000', height: isMobile ? '48px' : 'auto' }}
              >
                  CONFIRM RESERVATION
              </Button>
          </Box>
      </Modal>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? '100%' : 600, height: isMobile ? '100%' : 'auto', bgcolor: '#1a1a1a', border: isMobile ? 'none' : '2px solid #00d787', p: isMobile ? 2 : 4, borderRadius: isMobile ? 0 : 2, maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto'
        }}>
          <Typography variant="h6" sx={{ fontFamily: 'Orbitron', mb: 3, color: '#00d787' }}>NEW RESOURCE LISTING</Typography>
          <ResourceListingForm
            onSubmit={handleResourceSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Box>
      </Modal>
    </Box>
  );
};

export default ResourcesDashboard;
