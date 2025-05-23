import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box, Typography, CircularProgress, Paper, Grid
} from '@mui/material';
// Optional: Import icons if you decide to use them
// import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
// import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
// import './ImpactDisplay.css'; // Optional CSS file

const ImpactDisplay = ({ communityId, getAccessTokenSilently }) => {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImpactData = useCallback(async () => {
    if (!getAccessTokenSilently) {
      setError('Authentication service not available.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setImpactData(null); // Clear previous data

    const endpoint = communityId 
      ? `http://localhost:4000/impact/community/${communityId}`
      : 'http://localhost:4000/impact/summary';

    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setImpactData(response.data);
    } catch (err) {
      console.error('Error fetching impact data:', err);
      const errorMessage = err.response?.data?.message || `Failed to fetch impact data from ${endpoint}.`;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [communityId, getAccessTokenSilently]);

  useEffect(() => {
    fetchImpactData();
  }, [fetchImpactData]);

  const title = communityId 
    ? `Impact for Community ID: ${communityId}` // Fetching community name is out of scope
    : "Overall Platform Impact";

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3, minHeight: 150 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading impact data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={2} sx={{ p: 2, margin: 2, backgroundColor: 'error.light' }}>
        <Typography variant="h6" color="error.contrastText" gutterBottom>{title}</Typography>
        <Typography color="error.contrastText">Error: {error}</Typography>
      </Paper>
    );
  }

  if (!impactData) {
    return (
      <Paper elevation={2} sx={{ p: 2, margin: 2 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography>No impact data available at this time.</Typography>
      </Paper>
    );
  }

  // Dynamically access keys for community vs overall stats
  const needsFulfilledKey = communityId ? 'communityNeedsFulfilled' : 'needsFulfilled';
  const resourcesExchangedKey = communityId ? 'communityResourcesExchanged' : 'resourcesExchanged';
  // Example for a potential future metric
  // const activeUsersKey = communityId ? 'communityActiveUsersInExchanges' : 'activeUsersInExchanges';


  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, my: 2, borderRadius: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        {title}
      </Typography>
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'center' }}>
          <Paper elevation={1} sx={{ p: 2, backgroundColor: 'primary.lightest', borderRadius: '8px' }}>
            {/* Optional Icon: <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} /> */}
            <Typography variant="h6" component="div">
              {impactData[needsFulfilledKey] !== undefined ? impactData[needsFulfilledKey] : 0}
            </Typography>
            <Typography color="text.secondary">Needs Fulfilled</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'center' }}>
          <Paper elevation={1} sx={{ p: 2, backgroundColor: 'secondary.lightest', borderRadius: '8px' }}>
            {/* Optional Icon: <SwapHorizIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} /> */}
            <Typography variant="h6" component="div">
              {impactData[resourcesExchangedKey] !== undefined ? impactData[resourcesExchangedKey] : 0}
            </Typography>
            <Typography color="text.secondary">Resources Exchanged</Typography>
          </Paper>
        </Grid>
        {/* Placeholder for future metrics like 'Active Users in Exchanges' */}
        {/* impactData[activeUsersKey] !== undefined && (
          <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'center' }}>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: 'success.lightest', borderRadius: '8px' }}>
              <PeopleAltIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" component="div">
                {impactData[activeUsersKey]}
              </Typography>
              <Typography color="text.secondary">Active Users in Exchanges</Typography>
            </Paper>
          </Grid>
        )*/}
      </Grid>
    </Paper>
  );
};

ImpactDisplay.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Optional
  getAccessTokenSilently: PropTypes.func.isRequired,
};

export default ImpactDisplay;
