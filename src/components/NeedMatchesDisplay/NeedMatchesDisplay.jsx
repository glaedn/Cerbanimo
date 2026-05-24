import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box, Typography, Button, List, ListItem, ListItemText,
  CircularProgress, Paper, Divider, Chip, Snackbar, Alert
} from '@mui/material';
// import './NeedMatchesDisplay.css'; // Optional CSS file

const NeedMatchesDisplay = ({ needId, getAccessTokenSilently, loggedInUserId }) => {
  const [matches, setMatches] = useState({ resources: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [requestedResourceIds, setRequestedResourceIds] = useState(new Set());
  const [exchangeConfirm, setExchangeConfirm] = useState({ open: false, resource: null });

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
      setMatches(response.data);
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
    setExchangeConfirm({ open: true, resource });
  };

  const confirmExchange = async () => {
    const resource = exchangeConfirm.resource;
    setExchangeConfirm({ open: false, resource: null });

    if (!getAccessTokenSilently) {
      setNotification({ open: true, message: 'Authentication service not available.', severity: 'error' });
      return;
    }
    const payload = {
      needId: needId,
      resourceId: resource.id,
      notes: `Exchange request for resource '${resource.name}' to fulfill need ID '${needId}'.`
    };

    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/exchange/initiate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 201) {
        setNotification({ open: true, message: response.data.message || 'Exchange initiated successfully!', severity: 'success' });
        setRequestedResourceIds(prev => new Set(prev).add(resource.id));
      }
    } catch (err) {
      console.error('Error initiating exchange:', err);
      setNotification({ open: true, message: 'Failed to initiate exchange.', severity: 'error' });
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

  const { resources, users } = matches;

  return (
    <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      {/* Exchange Confirmation Modal */}
      <Snackbar
        open={exchangeConfirm.open}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" color="inherit" onClick={() => setExchangeConfirm({ open: false, resource: null })}>CANCEL</Button>
              <Button size="small" variant="contained" color="primary" onClick={confirmExchange}>CONFIRM</Button>
            </Box>
          }
          sx={{
            bgcolor: 'rgba(28, 28, 30, 0.95)',
            border: '1px solid #00F3FF',
            color: 'white',
            '& .MuiAlert-icon': { color: '#00F3FF' }
          }}
        >
          <Typography variant="body2" sx={{ fontFamily: 'Orbitron', mb: 1 }}>
            Initiate exchange for {exchangeConfirm.resource?.name}?
          </Typography>
          <Typography variant="caption" sx={{ color: '#ff5ca2', display: 'block', mb: 1 }}>
            🔥 2% transaction burn applies to reward flows.
          </Typography>
        </Alert>
      </Snackbar>
      {/* 1. Skilled Users Matches */}
      <Typography variant="h6" gutterBottom component="div" sx={{ mb: 2 }}>
        Matched Responders (by Skills)
      </Typography>
      {users.length === 0 ? (
        <Typography sx={{ mb: 4 }}>No skilled users matched this need yet.</Typography>
      ) : (
        <List sx={{ mb: 4 }}>
          {users.map((user, index) => (
            <React.Fragment key={user.id}>
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'row', alignItems: 'center' }}>
                <Box sx={{ mr: 2 }}>
                  <img
                    src={user.profile_picture || 'https://via.placeholder.com/50'}
                    alt={user.username}
                    style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }}
                  />
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {user.username}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Match Score:</strong> {user.match_score}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {user.location || 'Not specified'}
                      </Typography>
                    </>
                  }
                />
                <Button
                  variant="outlined"
                  size="small"
                  href={`/profile/${user.id}`}
                  sx={{ ml: 'auto' }}
                >
                  View Profile
                </Button>
              </ListItem>
              {index < users.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}

      <Divider sx={{ my: 3 }} />

      {/* 2. Resource Matches */}
      <Typography variant="h6" gutterBottom component="div" sx={{ mb: 2 }}>
        Potential Resource Matches
      </Typography>
      {resources.length === 0 ? (
        <Typography>No resource matches found at this time.</Typography>
      ) : (
        <List>
          {resources.map((resource, index) => (
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
                        <strong>Match Score:</strong> {resource.match_score}%
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Quantity:</strong> {resource.quantity || 'N/A'}
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
              {index < resources.length - 1 && <Divider sx={{ my: 1 }} />}
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
