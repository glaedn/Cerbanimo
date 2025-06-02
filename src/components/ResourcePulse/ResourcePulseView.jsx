import React, { useState, useEffect, useCallback } from 'react';
import MatchCard from './MatchCard';
import './ResourcePulse.css'; // Import CSS
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

// Placeholder for user ID retrieval - in a real app, this would come from auth context or similar
const getCurrentUserId = async () => {
  // Simulate async call
  await new Promise(resolve => setTimeout(resolve, 100));
  // Replace with actual user ID retrieval. For now, using a placeholder.
  // This needs to be configured based on how user auth is handled in the actual application.
  // It might involve accessing localStorage, a global state, or an auth context.
  // For testing, you might hardcode a user ID known to have data.
  const userId = localStorage.getItem('userId'); // Example: if userId is stored in localStorage
  if (!userId) {
    console.warn('ResourcePulseView: No userId found in localStorage. Using placeholder "1". Ensure this is correctly configured.');
    return '1'; // Fallback placeholder if not found
  }
  return userId;
};


// Helper for API calls - replace with a more robust solution if available (e.g., utils/api.js)
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token'); // Or however auth token is stored
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`API Error (${response.status}): ${errorBody} for URL: ${url}`);
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  // For 204 No Content, response.json() will fail.
  if (response.status === 204) {
    return null;
  }
  return response.json();
};


const ResourcePulseView = () => {
  const [userNeeds, setUserNeeds] = useState([]);
  const [userResources, setUserResources] = useState([]);
  const [matchesForNeeds, setMatchesForNeeds] = useState([]); // { need, matches: [resourceMatch] }
  const [matchesForResources, setMatchesForResources] = useState([]); // { resource, matches: [needMatch] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserIdAndInitialData = async () => {
      try {
        const id = await getCurrentUserId();
        setUserId(id);
      } catch (e) {
        console.error("Failed to get user ID", e);
        setError("Could not determine user. Please ensure you are logged in.");
        setLoading(false);
      }
    };
    fetchUserIdAndInitialData();
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId) {
        // Don't fetch if userId is not yet set, or if initial fetch failed.
        // If loading is true, it will keep showing loading. If error is set, it shows error.
        if (!loading && !error) { // Only set error if not already loading or in error state
            setError("User ID not available. Cannot fetch data.");
        }
        setLoading(false); // Ensure loading stops if userId is missing.
        return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user's active needs
      const needs = await apiFetch(`/api/needs/user/${userId}?status=open`);
      setUserNeeds(needs || []);

      // Fetch user's available resources
      const resources = await apiFetch(`/api/resources/user/${userId}?status=available`);
      setUserResources(resources || []);

      // Fetch matches for each need
      const needsMatchesPromises = (needs || []).map(async (need) => {
        try {
          const matches = await apiFetch(`/api/matching/need/${need.id}`);
          return { need, matches: matches || [] };
        } catch (matchError) {
          console.warn(`Failed to fetch matches for need ${need.id}:`, matchError.message);
          return { need, matches: [] }; // Return empty matches on error for this specific item
        }
      });
      const resolvedNeedsMatches = await Promise.all(needsMatchesPromises);
      setMatchesForNeeds(resolvedNeedsMatches);

      // Fetch matches for each resource
      const resourcesMatchesPromises = (resources || []).map(async (resource) => {
         try {
            const matches = await apiFetch(`/api/matching/resource/${resource.id}`);
            return { resource, matches: matches || [] };
        } catch (matchError) {
            console.warn(`Failed to fetch matches for resource ${resource.id}:`, matchError.message);
            return { resource, matches: [] };
        }
      });
      const resolvedResourcesMatches = await Promise.all(resourcesMatchesPromises);
      setMatchesForResources(resolvedResourcesMatches);

    } catch (e) {
      console.error('Failed to fetch data for Resource Pulse:', e);
      setError(`Failed to load data: ${e.message}. Ensure the backend is running and accessible.`);
    } finally {
      setLoading(false);
    }
  }, [userId, loading, error]); // Added loading and error to dependency array to avoid re-fetching if already in error/loading state for other reasons.

  useEffect(() => {
    if (userId) { // Only run fetchData if userId is available
        fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Trigger fetchData when userId is set/changed. fetchData itself is memoized with useCallback.


  if (loading) {
    return (
      <Box className="resource-pulse-view" sx={{ textAlign: 'center', p: 3 }}>
        <CircularProgress />
        <Typography>Loading Resource Pulse...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="resource-pulse-view" sx={{ p: 2 }}>
        <Alert severity="error" className="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Paper elevation={2} className="resource-pulse-view" sx={{ p: 2, backgroundColor: '#f0f2f5' }}>
      <Typography variant="h4" gutterBottom component="h1" sx={{ color: '#0056b3', textAlign: 'center', mb: 3 }}>
        Resource Pulse
      </Typography>

      <Box className="matches-section" sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Resources Matching Your Needs
        </Typography>
        {userNeeds.length === 0 && <Typography className="no-matches">You have no active needs.</Typography>}
        {matchesForNeeds.map(({ need, matches }) => (
          <Paper key={need.id} className="original-item-container" sx={{ p: 2, mb: 2, backgroundColor: 'white' }}>
            <Typography variant="h6" component="h3">Your Need: {need.name}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Category: {need.category} {need.location_text && `| Location: ${need.location_text}`}
            </Typography>
            {matches.length > 0 ? (
              matches.map((resourceMatch) => (
                <MatchCard key={resourceMatch.id} match={resourceMatch} type="need_match" />
              ))
            ) : (
              <Typography className="no-matches">No current matches found for this need.</Typography>
            )}
          </Paper>
        ))}
      </Box>

      <Box className="matches-section">
        <Typography variant="h5" component="h2" gutterBottom>
          Needs Matching Your Resources
        </Typography>
        {userResources.length === 0 && <Typography className="no-matches">You have no available resources.</Typography>}
        {matchesForResources.map(({ resource, matches }) => (
          <Paper key={resource.id} className="original-item-container" sx={{ p: 2, mb: 2, backgroundColor: 'white' }}>
            <Typography variant="h6" component="h3">Your Resource: {resource.name}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Category: {resource.category} {resource.location_text && `| Location: ${resource.location_text}`}
            </Typography>
            {matches.length > 0 ? (
              matches.map((needMatch) => (
                <MatchCard key={needMatch.id} match={needMatch} type="resource_match" />
              ))
            ) : (
              <Typography className="no-matches">No current matches found for this resource.</Typography>
            )}
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};

export default ResourcePulseView;
