import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box, Typography, Button, List, ListItem, ListItemText,
  CircularProgress, Paper, Divider, Chip, Snackbar, Alert
} from '@mui/material';
// import './ResourceMatchesDisplay.css'; // Optional CSS file

const URGENCY_COLORS = {
  low: 'default', // or 'success.light' from theme
  medium: 'warning.light',
  high: 'error.light',
  critical: 'error.dark',
};

const ResourceMatchesDisplay = ({ resourceId, getAccessTokenSilently, loggedInUserId }) => {
  const [matchedNeeds, setMatchedNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [offeredHelpForNeedIds, setOfferedHelpForNeedIds] = useState(new Set());

  const fetchMatches = useCallback(async () => {
    if (!resourceId || !getAccessTokenSilently) {
      setLoading(false);
      setError('Missing resource ID or authentication service.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`http://localhost:4000/matching/resource/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMatchedNeeds(response.data);
    } catch (err) {
      console.error('Error fetching matched needs:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch need matches.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [resourceId, getAccessTokenSilently]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);
  
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const handleOfferHelp = async (need) => {
    if (!getAccessTokenSilently) {
      setNotification({ open: true, message: 'Authentication service not available.', severity: 'error' });
      return;
    }
    const payload = {
      needId: need.id,
      resourceId: resourceId,
      notes: `Offer to fulfill need '${need.name}' with resource ID '${resourceId}'.` // Example note
    };

    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`http://localhost:4000/exchange/initiate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 201) {
        setNotification({ open: true, message: response.data.message || 'Exchange initiated successfully! A coordination task has been created.', severity: 'success' });
        setOfferedHelpForNeedIds(prev => new Set(prev).add(need.id));
      } else {
        setNotification({ open: true, message: response.data.message || 'Failed to initiate exchange.', severity: 'error' });
      }
    } catch (err) {
      console.error('Error initiating exchange (offering help):', err.response ? err.response.data : err.message);
      const errorMsg = err.response?.data?.message || 'An error occurred while offering help.';
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  const getUrgencyColor = (urgency) => {
    return URGENCY_COLORS[urgency?.toLowerCase()] || 'default';
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading potential need matches...</Typography>
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
        Potential Need Matches for Your Resource
      </Typography>
      {matchedNeeds.length === 0 ? (
        <Typography>No open needs match your resource at this time.</Typography>
      ) : (
        <List>
          {matchedNeeds.map((need, index) => (
            <React.Fragment key={need.id}>
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                    {need.name}
                  </Typography>
                  <Chip 
                    label={`Urgency: ${need.urgency || 'N/A'}`} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getUrgencyColor(need.urgency),
                      color: URGENCY_COLORS[need.urgency?.toLowerCase()] && URGENCY_COLORS[need.urgency?.toLowerCase()] !== 'default' ? 'common.white' : 'text.primary' // Ensure contrast
                    }} 
                  />
                </Box>
                <Chip label={need.category || 'Uncategorized'} size="small" sx={{ mb: 1, mt: 0.5, backgroundColor: '#e0e0e0' }} />
                
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 1 }}>
                      <strong>Description:</strong> {need.description || 'Not specified'}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Quantity Needed:</strong> {need.quantity_needed || 'N/A'}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Location:</strong> {need.location_text || 'N/A'}
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <strong>Required Before:</strong> {formatDate(need.required_before_date)}
                      </Typography>
                      <Typography component="div" variant="body2" sx={{ color: need.status === 'open' ? 'success.main' : 'text.secondary', mt: 0.5 }}>
                          <strong>Status:</strong> {need.status || 'N/A'}
                      </Typography>
                    </>
                  }
                />
                <Box sx={{ mt: 1.5, width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={() => handleOfferHelp(need)}
                    disabled={offeredHelpForNeedIds.has(need.id) || need.status !== 'open'}
                  >
                    {offeredHelpForNeedIds.has(need.id) ? 'Offered' : (need.status !== 'open' ? 'Not Open' : 'Offer Help / Fulfill Need')}
                  </Button>
                </Box>
              </ListItem>
              {index < matchedNeeds.length - 1 && <Divider sx={{ my: 1 }} />}
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

ResourceMatchesDisplay.propTypes = {
  resourceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  getAccessTokenSilently: PropTypes.func.isRequired,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ResourceMatchesDisplay;
