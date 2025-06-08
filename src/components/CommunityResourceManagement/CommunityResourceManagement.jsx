import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Button, List, ListItem, ListItemText, IconButton,
  Modal, Paper, CircularProgress, Snackbar, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ResourceListingForm from '../ResourceListingForm/ResourceListingForm'; // Adjust path if needed

const CommunityResourceManagement = ({ communityId }) => {
  const [communityResources, setCommunityResources] = useState([]);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const { user: loggedInUser, getAccessTokenSilently } = useAuth0(); // Get user and token function from Auth0
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
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

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
        // Ensure owner_community_id is maintained if present, or added if this is primarily a community resource
        payload.owner_community_id = payload.owner_community_id || communityId;
        response = await axios.put(`http://localhost:4000/resources/${editingResource.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Resource updated successfully!', 'success');
      } else {
        payload.owner_community_id = communityId; // Explicitly set for new community resource
        // Regarding owner_user_id for new community resources:
        // If the form includes owner_user_id (e.g., from a hidden field or if admin is creating for specific user), it will be part of `resourceData`.
        // If it should be explicitly nulled for community resources, do: payload.owner_user_id = null;
        // For now, we assume the backend handles logic if both owner_user_id and owner_community_id are present,
        // or that `ResourceListingForm` doesn't set `owner_user_id` when used in this context.
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
      // Keep modal open on error for user to correct
    } finally {
      setLoading(false); // Only set loading false, modal closing is handled on success
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!getAccessTokenSilently) {
        showNotification('Authentication service not available.', 'error');
        return;
    }
    // Basic permission check placeholder:
    // In a real app, check if loggedInUserId has rights to delete,
    // e.g., is resource owner or community admin.
    // For now, this component assumes parent/caller handles higher-level permissions.

    if (window.confirm('Are you sure you want to delete this resource?')) {
      setLoading(true);
      try {
        const token = await getAccessTokenSilently();
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/resources/${resourceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Resource deleted successfully!', 'success');
        fetchCommunityResources(); // Refresh list
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
    <Paper className="resource-modal-paper" elevation={2} sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      <Typography variant="h6" gutterBottom component="div">
        Community Resources
      </Typography>
      
      {/* Consider adding a check here if loggedInUserId has rights to add resources in this communityId */}
      <Button variant="contained" color="primary" onClick={() => handleOpenResourceModal()} sx={{ mb: 2 }} disabled={loading}>
        List New Community Resource
      </Button>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
      
      {error && !loading && (
        <Typography color="error" sx={{ my: 2 }}>
          Error: {error}
        </Typography>
      )}

      {!loading && !error && communityResources.length === 0 && (
        <Typography sx={{ my: 2 }}>No resources listed for this community yet.</Typography>
      )}

      {!loading && !error && communityResources.length > 0 && (
        <List>
          {communityResources.map((resource) => (
            <ListItem
              key={resource.id}
              divider
              secondaryAction={
                <>
                  {/* Consider more granular permissions for edit/delete based on loggedInUserId vs resource.owner_user_id or community role */}
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenResourceModal(resource)} sx={{ mr: 0.5 }} disabled={loading}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteResource(resource.id)} disabled={loading}>
                    <DeleteIcon />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={resource.name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Category: {resource.category || 'N/A'}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2" color="text.secondary">
                      Quantity: {resource.quantity || 'N/A'} - Status: {resource.status || 'N/A'}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Modal
        open={isResourceModalOpen}
        onClose={handleCloseResourceModal}
        aria-labelledby="resource-listing-form-modal-title"
      >
        <Paper sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '75%', md: '600px' },
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
        }}>
          <Typography variant="h6" id="resource-listing-form-modal-title" gutterBottom>
            {editingResource ? 'Edit Community Resource' : 'List New Community Resource'}
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
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

CommunityResourceManagement.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Optional, for future permission checks
};

export default CommunityResourceManagement;
