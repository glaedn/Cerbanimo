import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Button, List, ListItem, ListItemText, IconButton,
  Modal, Paper, CircularProgress, Snackbar, Alert, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ResourceListingForm from '../ResourceListingForm/ResourceListingForm';
import './CommunityResourceManagement.css';

const CommunityResourceManagement = ({ communityId }) => {
  const [communityResources, setCommunityResources] = useState([]);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const { user: loggedInUser, getAccessTokenSilently } = useAuth0();

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const fetchCommunityResources = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources/community/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommunityResources(response.data);
    } catch (err) {
      console.error('Error fetching community resources:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch community resources.';
      setError(errorMessage);
      // Only show notification if it's not a 404/no resources found
      if (err.response?.status !== 404) {
        showNotification(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [communityId, getAccessTokenSilently]);

  useEffect(() => {
    fetchCommunityResources();
  }, [fetchCommunityResources]);

  const handleOpenResourceModal = (resource = null) => {
    setEditingResource(resource);
    setIsResourceModalOpen(true);
  };

  const handleCloseResourceModal = () => {
    setIsResourceModalOpen(false);
    setEditingResource(null);
  };

  const handleResourceSubmit = async (resourceData) => {
    if (!getAccessTokenSilently) {
        showNotification('Authentication service not available.', 'error');
        return;
    }
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      let response;
      const payload = { ...resourceData };

      if (editingResource) {
        payload.owner_community_id = payload.owner_community_id || communityId;
        response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/resources/${editingResource.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Resource updated successfully!', 'success');
      } else {
        payload.owner_community_id = communityId;
        response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Resource created successfully!', 'success');
      }
      
      fetchCommunityResources();
      handleCloseResourceModal();
    } catch (err) {
      console.error('Error submitting resource:', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.error || 'Failed to save resource.';
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!getAccessTokenSilently) {
        showNotification('Authentication service not available.', 'error');
        return;
    }

    if (window.confirm('Are you sure you want to delete this resource?')) {
      setLoading(true);
      try {
        const token = await getAccessTokenSilently();
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/resources/${resourceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Resource deleted successfully!', 'success');
        fetchCommunityResources();
      } catch (err) {
        console.error('Error deleting resource:', err);
        const errorMsg = err.response?.data?.error || 'Failed to delete resource.';
        showNotification(errorMsg, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box className="resource-management-container glass-panel" sx={{ p: { xs: 2, sm: 3 }, mt: 4, mb: 4 }}>
      <Typography variant="h5" sx={{ color: 'var(--hud-primary-color)', fontFamily: 'var(--hud-header-font)', mb: 3 }}>
        COMMUNITY RESOURCES
      </Typography>
      
      <Button
        variant="contained"
        onClick={() => handleOpenResourceModal()}
        sx={{
          mb: 3,
          background: 'linear-gradient(45deg, var(--hud-primary-color), #4DABF7)',
          color: 'black',
          fontWeight: 'bold',
          fontFamily: 'var(--hud-header-font)',
          '&:hover': {
            background: 'linear-gradient(45deg, #4DABF7, var(--hud-primary-color))',
            boxShadow: '0 0 15px var(--hud-glow-color)'
          }
        }}
        disabled={loading}
      >
        LIST NEW RESOURCE
      </Button>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress sx={{ color: 'var(--hud-primary-color)' }} /></Box>}
      
      {error && !loading && (
        <Typography sx={{ my: 2, color: 'var(--hud-error-color)', fontFamily: 'var(--hud-header-font)' }}>
          SYSTEM ERROR: {error}
        </Typography>
      )}

      {!loading && communityResources.length === 0 && !error && (
        <Typography sx={{ my: 2, color: 'var(--hud-text-secondary)', textAlign: 'center' }}>No resources listed for this community yet.</Typography>
      )}

      {!loading && communityResources.length > 0 && (
        <List sx={{ width: '100%' }}>
          {communityResources.map((resource) => (
            <ListItem
              key={resource.id}
              className="resource-item"
              sx={{
                mb: 2,
                border: '1px solid rgba(var(--hud-primary-color-rgb), 0.2)',
                borderRadius: 1,
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                '&:hover': {
                  borderColor: 'var(--hud-primary-color)',
                  bgcolor: 'rgba(255, 255, 255, 0.05)'
                }
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Edit">
                    <IconButton
                      onClick={() => handleOpenResourceModal(resource)}
                      sx={{ color: 'var(--hud-primary-color)' }}
                      disabled={loading}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      onClick={() => handleDeleteResource(resource.id)}
                      sx={{ color: 'var(--hud-error-color)' }}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText
                primary={resource.name}
                primaryTypographyProps={{ sx: { color: 'var(--hud-primary-color)', fontFamily: 'var(--hud-header-font)' } }}
                secondary={
                  <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                    <Typography component="span" variant="body2" sx={{ color: 'var(--hud-secondary-color)', mr: 2 }}>
                      {resource.category?.toUpperCase() || 'GENERAL'}
                    </Typography>
                    <Typography component="span" variant="body2" sx={{ color: 'var(--hud-text-secondary)' }}>
                      QTY: {resource.quantity || 1} • STATUS: {resource.status?.toUpperCase() || 'AVAILABLE'}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Modal
        open={isResourceModalOpen}
        onClose={handleCloseResourceModal}
      >
        <Paper className="glass-panel" sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '75%', md: '600px' },
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'rgba(3, 6, 18, 0.95)',
          border: '1px solid var(--hud-primary-color)',
          boxShadow: '0 0 20px var(--hud-glow-color)',
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
          backdropFilter: 'blur(20px)'
        }}>
          <Typography variant="h5" sx={{ mb: 3, color: 'var(--hud-primary-color)', fontFamily: 'var(--hud-header-font)', textAlign: 'center' }}>
            {editingResource ? 'EDIT RESOURCE' : 'LIST RESOURCE'}
          </Typography>
          <ResourceListingForm
            initialResourceData={editingResource}
            onSubmit={handleResourceSubmit}
            onCancel={handleCloseResourceModal}
          />
        </Paper>
      </Modal>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{
            width: '100%',
            bgcolor: notification.severity === 'success' ? 'var(--hud-success-color)' : 'var(--hud-error-color)',
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

CommunityResourceManagement.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default CommunityResourceManagement;
