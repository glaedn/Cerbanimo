import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Button, List, ListItem, ListItemText, Modal, TextField,
  CircularProgress, Divider, Paper
} from '@mui/material';
import { Box as BoxIcon, Calendar, Wrench, MapPin, Plus } from 'lucide-react';
import ResourceListingForm from '../components/ResourceListingForm/ResourceListingForm';

const ResourcesDashboard = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const [resources, setResources] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platformUserId, setPlatformUserId] = useState(null);

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

        // Mock allocations for now
        setAllocations([
            { id: 1, resourceName: '3D Printer', taskName: 'Prototype Housing', startTime: '2023-10-27 10:00', status: 'reserved' }
        ]);

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
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources_v2/allocate`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      alert("Resource listed/allocated successfully.");
    } catch (err) {
      alert("Failed to process resource.");
    }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <Box p={4} sx={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h3" sx={{ fontFamily: 'Orbitron', color: '#00d787' }}>RESOURCE INVENTORY</Typography>
        <Button
          variant="outlined"
          startIcon={<Plus />}
          onClick={() => setIsModalOpen(true)}
          sx={{ color: '#00d787', borderColor: '#00d787' }}
        >
          LIST NEW RESOURCE
        </Button>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#00d787' }}>YOUR ASSETS</Typography>
          <Grid container spacing={2}>
            {resources.length === 0 ? (
                <Grid item xs={12}><Typography color="gray">No resources listed in your inventory.</Typography></Grid>
            ) : resources.map(r => (
              <Grid item xs={12} sm={6} key={r.id}>
                <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="h6">{r.name}</Typography>
                      <Chip label={r.status.toUpperCase()} size="small" sx={{ bgcolor: '#003311', color: '#00d787' }} />
                    </Box>
                    <Typography variant="body2" color="gray" sx={{ mb: 2 }}>{r.description}</Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <BoxIcon size={14} /> <Typography variant="caption">{r.category} ({r.quantity} {r.unit})</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Wrench size={14} /> <Typography variant="caption">Condition: {r.condition}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <MapPin size={14} /> <Typography variant="caption">{r.location_text || 'Digital/Remote'}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron', mb: 2, color: '#00d787' }}>BOOKING SCHEDULE</Typography>
          <Paper sx={{ bgcolor: '#111', p: 2, border: '1px solid #333' }}>
            <List>
              {allocations.map(a => (
                <ListItem key={a.id} divider sx={{ borderColor: '#222', px: 0 }}>
                  <ListItemText
                    primary={a.resourceName}
                    secondary={`${a.taskName} | ${a.startTime}`}
                    primaryTypographyProps={{ color: '#00d787' }}
                    secondaryTypographyProps={{ color: 'gray' }}
                  />
                  <Chip label={a.status} size="small" variant="outlined" sx={{ color: 'gray', borderColor: 'gray' }} />
                </ListItem>
              ))}
            </List>
            <Button fullWidth sx={{ mt: 2, color: '#00d787' }} startIcon={<Calendar size={16} />}>VIEW FULL CALENDAR</Button>
          </Paper>
        </Grid>
      </Grid>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', md: 600 }, bgcolor: '#1a1a1a', border: '2px solid #00d787', p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto'
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
