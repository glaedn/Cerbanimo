import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box, Typography, Button, List, ListItem, ListItemText, IconButton,
  Modal, Paper, CircularProgress, Snackbar, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NeedDeclarationForm from '../NeedDeclarationForm/NeedDeclarationForm'; // Adjust path if needed

const CommunityNeedDeclaration = ({ communityId, loggedInUserId, getAccessTokenSilently }) => {
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [communityNeeds, setCommunityNeeds] = useState([]);
  const [editingNeed, setEditingNeed] = useState(null);
  const [loadingNeeds, setLoadingNeeds] = useState(true);
  const [errorNeeds, setErrorNeeds] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const fetchCommunityNeeds = useCallback(async () => {
    if (!communityId || !getAccessTokenSilently) {
      setLoadingNeeds(false);
      return;
    }
    setLoadingNeeds(true);
    setErrorNeeds(null);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/needs/community/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommunityNeeds(response.data);
    } catch (err) {
      console.error('Error fetching community needs:', err);
      const errorMessage = err.response?.data?.error || 'Failed to fetch community needs.';
      setErrorNeeds(errorMessage);
      // showNotification(errorMessage, 'error'); // Optionally notify on fetch error
    } finally {
      setLoadingNeeds(false);
    }
  }, [communityId, getAccessTokenSilently]);

  useEffect(() => {
    fetchCommunityNeeds();
  }, [fetchCommunityNeeds]);

  const handleOpenNeedModal = (need = null) => {
    setEditingNeed(need);
    setIsNeedModalOpen(true);
  };

  const handleCloseNeedModal = () => {
    setIsNeedModalOpen(false);
    setEditingNeed(null);
  };

  const handleNeedSubmit = async (needData) => {
    if (!getAccessTokenSilently) {
      showNotification('Authentication service not available.', 'error');
      return;
    }
    setLoadingNeeds(true); // Indicate loading state during submission
    try {
      const token = await getAccessTokenSilently();
      let response;
      // NeedDeclarationForm already sets requestor_community_id when communityId prop is passed.
      // It also sets requestor_user_id if loggedInUserId is passed and communityId is not.
      // For this component, communityId is always passed to NeedDeclarationForm.
      const payload = { ...needData }; 
      
      if (editingNeed) {
        response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/needs/${editingNeed.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Community need updated successfully!', 'success');
      } else {
        response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/needs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Community need declared successfully!', 'success');
      }
      
      fetchCommunityNeeds(); // Refresh list
      handleCloseNeedModal();
    } catch (err) {
      console.error('Error submitting community need:', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.error || 'Failed to save community need.';
      showNotification(errorMsg, 'error');
    } finally {
      setLoadingNeeds(false); // Submission attempt finished
    }
  };

  const handleDeleteNeed = async (needId) => {
    if (!getAccessTokenSilently) {
      showNotification('Authentication service not available.', 'error');
      return;
    }
    // Basic permission check placeholder:
    // A real app might check if loggedInUserId is a community admin or the original declarer of the need.
    // For now, this component assumes parent/caller handles higher-level permissions for *rendering* this component.
    // The delete action itself is open if this component is rendered.

    if (window.confirm('Are you sure you want to delete this community need?')) {
      setLoadingNeeds(true); // Indicate loading state during deletion
      try {
        const token = await getAccessTokenSilently();
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/needs/${needId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification('Community need deleted successfully!', 'success');
        fetchCommunityNeeds(); // Refresh list
      } catch (err) {
        console.error('Error deleting community need:', err);
        const errorMsg = err.response?.data?.error || 'Failed to delete community need.';
        showNotification(errorMsg, 'error');
      } finally {
        setLoadingNeeds(false); // Deletion attempt finished
      }
    }
  };

  return (
    <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      <Typography variant="h6" gutterBottom component="div">
        Community Needs
      </Typography>
      
      {/* Consider adding a check here if loggedInUserId has rights to add needs in this communityId (e.g., is a member) */}
      <Button variant="contained" color="secondary" onClick={() => handleOpenNeedModal()} sx={{ mb: 2 }} disabled={loadingNeeds}>
        Declare New Community Need
      </Button>

      {loadingNeeds && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
      
      {errorNeeds && !loadingNeeds && (
        <Typography color="error" sx={{ my: 2 }}>
          Error: {errorNeeds}
        </Typography>
      )}

      {!loadingNeeds && !errorNeeds && communityNeeds.length === 0 && (
        <Typography sx={{ my: 2 }}>No needs declared for this community yet.</Typography>
      )}

      {!loadingNeeds && !errorNeeds && communityNeeds.length > 0 && (
        <List>
          {communityNeeds.map((need) => (
            <ListItem
              key={need.id}
              divider
              secondaryAction={
                <>
                  {/* Consider more granular permissions for edit/delete based on loggedInUserId vs need.requestor_user_id or community role */}
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenNeedModal(need)} sx={{ mr: 0.5 }} disabled={loadingNeeds}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteNeed(need.id)} disabled={loadingNeeds}>
                    <DeleteIcon />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={need.name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Urgency: {need.urgency || 'N/A'} - Quantity: {need.quantity_needed || 'N/A'}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2" color="text.secondary">
                      Status: {need.status || 'N/A'}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Modal
        open={isNeedModalOpen}
        onClose={handleCloseNeedModal}
        aria-labelledby="community-need-form-modal-title"
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
          <Typography variant="h6" id="community-need-form-modal-title" gutterBottom>
            {editingNeed ? 'Edit Community Need' : 'Declare New Community Need'}
          </Typography>
          <NeedDeclarationForm
            initialNeedData={editingNeed}
            onSubmit={handleNeedSubmit}
            onCancel={handleCloseNeedModal}
            loggedInUserId={loggedInUserId} // Pass loggedInUserId for potential internal use by form if needed
            communityId={communityId}       // Crucial: ensures form sets requestor_community_id
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

CommunityNeedDeclaration.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  getAccessTokenSilently: PropTypes.func.isRequired,
};

export default CommunityNeedDeclaration;
