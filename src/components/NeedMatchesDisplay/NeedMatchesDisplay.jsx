import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box, Typography, Button, List, ListItem, ListItemText,
  CircularProgress, Paper, Divider, Chip, Snackbar, Alert
} from '@mui/material';
// import './NeedMatchesDisplay.css'; // Optional CSS file

const NeedMatchesDisplay = ({ needId, getAccessTokenSilently, loggedInUserId }) => {
  const [matchedResources, setMatchedResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [requestedResourceIds, setRequestedResourceIds] = useState(new Set());

  const fetchMatches = useCallback(async () => {
    if (!needId || !getAccessTokenSilently) {
      setLoading(false);
      setError('Missing need ID or authentication service.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/matching/need/${needId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatchedResources(response.data);
    } catch (err) {
      console.error('Error fetching matched resources:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch resource matches.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [needId, getAccessTokenSilently]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const handleRequestExchange = async (resource) => {
    if (!getAccessTokenSilently) {
      setNotification({ open: true, message: 'Authentication service not available.', severity: 'error' });
      return;
    }
    const payload = {
      needId: needId,
      resourceId: resource.id,
      notes: `Exchange request for resource '${resource.name}' to fulfill need ID '${needId}'.` // Example note
    };

    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/exchange/initiate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 201) {
        setNotification({ open: true, message: response.data.message || 'Exchange initiated successfully! A coordination task has been created.', severity: 'success' });
        setRequestedResourceIds(prev => new Set(prev).add(resource.id));
        // Optionally, refresh or update the specific resource's status in matchedResources if the backend doesn't change it immediately
        // For now, just disabling the button is handled.
      } else {
        // This case might not be reached if server throws error for non-201
        setNotification({ open: true, message: response.data.message || 'Failed to initiate exchange.', severity: 'error' });
      }
    } catch (err) {
      console.error('Error initiating exchange:', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.message || 'An error occurred while initiating the exchange.';
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading matches...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 2, margin: 2, backgroundColor: 'error.light' }}>
        <Typography color="error.contrastText">Error: {error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      <Typography variant="h6" gutterBottom component="div" sx={{ mb: 2 }}>
        Potential Resource Matches
      </Typography>
      {matchedResources.length === 0 ? (
        <Typography>No resource matches found at this time.</Typography>
      ) : (
        <List>
          {matchedResources.map((resource, index) => (
            <React.Fragment key={resource.id}>
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                    {resource.name}
                  </Typography>
                  <Chip label={resource.category || 'Uncategorized'} size="small" sx={{ mb: 1, backgroundColor: '#e0e0e0' }} />
                </Box>
                
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary" component="div">
                      <strong>Description:</strong> {resource.description || 'Not specified'}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Quantity:</strong> {resource.quantity || 'N/A'}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Condition:</strong> {resource.condition || 'N/A'}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Location:</strong> {resource.location_text || 'N/A'}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Availability:</strong> 
                        {resource.availability_window_start || resource.availability_window_end 
                          ? `${formatDate(resource.availability_window_start)} - ${formatDate(resource.availability_window_end)}` 
                          : 'Always available or not specified'}
                      </Typography>
                      {resource.is_recurring && (
                        <Typography component="div" variant="body2" color="text.secondary">
                          <strong>Recurring:</strong> {resource.recurring_details || 'Yes'}
                        </Typography>
                      )}
                       <Typography component="div" variant="body2" sx={{ color: resource.status === 'available' ? 'success.main' : 'text.secondary', mt: 0.5 }}>
                          <strong>Status:</strong> {resource.status || 'N/A'}
                      </Typography>
                    </>
                  }
                />
                <Box sx={{ mt: 1.5, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleRequestExchange(resource)}
                    disabled={requestedResourceIds.has(resource.id) || resource.status !== 'available'}
                  >
                    {requestedResourceIds.has(resource.id) ? 'Requested' : (resource.status !== 'available' ? 'Unavailable' : 'I\'m Interested / Request Exchange')}
                  </Button>
                </Box>
              </ListItem>
              {index < matchedResources.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}
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

NeedMatchesDisplay.propTypes = {
  needId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  getAccessTokenSilently: PropTypes.func.isRequired,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default NeedMatchesDisplay;
