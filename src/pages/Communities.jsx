import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Grid, Chip, Paper, CircularProgress } from '@mui/material';
import { useIsMobile } from '../hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';
import './Communities.css';

const Communities = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [communityProjects, setCommunityProjects] = useState([]);
  
  const navigate = useNavigate();
  
  // Comprehensive case-insensitive search function
  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchCommunities = async () => {
    try {
      const token = await getAccessTokenSilently();
  
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities`, {
        params: { search, page },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Fetched Communities:', response.data);
    
      // Extract the communities array from the response data
      const communitiesArray = response.data.communities || [];
      
      if (communitiesArray.length === 0) {
        console.log('No communities data returned from API');
      }
      
      // Apply search filter if there's a search term
      const searchTerm = search.trim();
      const filteredCommunities = searchTerm 
        ? communitiesArray.filter(community => {
            // Check if search term matches name or description
            return matchesSearch(community.name || '', searchTerm) || 
                   matchesSearch(community.description || '', searchTerm);
          })
        : communitiesArray;
        
      console.log('Filtered Communities:', filteredCommunities);
      
      // Set the communities state
      setCommunities(filteredCommunities);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
      // Initialize with empty array on error
      setCommunities([]);
    }
  };

  const fetchCommunityProjects = async (communityId) => {
    try {
      const token = await getAccessTokenSilently();
      
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    
      console.log('Fetched Community Projects:', response.data);
      setCommunityProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch community projects:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Server status:', error.response.status);
      }
    }
  };

  const joinCommunity = async (communityId) => {
    try {
      const token = await getAccessTokenSilently();
      
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}/join`, 
        { userId: user.sub }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh communities to update member count
      fetchCommunities();
      
    } catch (error) {
      console.error('Failed to join community:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchCommunities();
    }
  }, [user, page, search]);

useEffect(() => {
    console.log('Current communities state:', communities);
}, [communities]);

return (
    <div className="communities-container">
        <h1 className="community-page-title">DISCOVER COMMUNITIES</h1>

        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder="Search Realms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                    mr: 1,
                    '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                        '&:hover fieldset': { borderColor: '#00f3ff' },
                    }
                }}
            />
            <Button
                variant="contained"
                onClick={() => navigate('/communitycreation')}
                sx={{
                    minWidth: isMobile ? '56px' : '50px',
                    width: isMobile ? '56px' : '50px',
                    flexShrink: 0,
                    height: isMobile ? '56px' : '40px',
                    borderRadius: '50%',
                    bgcolor: '#00f3ff',
                    color: '#000',
                    fontSize: '1.5rem'
                }}
            >
                +
            </Button>
        </Box>

        <Box className="community-list-wrapper" sx={{ width: isMobile ? '100%' : '80%' }}>
            <Grid container spacing={2} component={motion.div} layout>
            {communities.length > 0 ? (
                communities.map((community) => (
                    <div key={community.id} className="community-card">
                        <h2 className="community-title">{community.name.toUpperCase()}</h2>
                        <p className="community-description">{community.description}</p>
                        <div className="community-tags">
                            {community.interest_tags && community.interest_tags.length > 0 ? (
                                community.interest_tags.map((tag, index) => (
                                    <span key={index} className="tag-chip">{tag}</span>
                                ))
                            ) : (
                                <span className="no-tags">No tags</span>
                            )}
                        </div>
                        <div className="community-footer">
                            <div className="community-stats">
                                <span className="stat-number">{Array.isArray(community.members) ? community.members.length : 0}</span>
                                <span className="stat-label">POPULATION</span>
                            </div>
                            <button
                                className="join-button"
                                onClick={() => navigate(`/communityhub/${community.id}`)}
                            >
                                ENTER
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                          <div className="no-communities-message" style={{ padding: '20px', textAlign: 'center' }}>
                            <p>No communities found. Try adjusting your search or create a new community.</p>
                          </div>
                        )}
                      </div>

                      <Box className="pagination-container" sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 4, mb: isMobile ? 4 : 0 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                          sx={{ color: '#00f3ff', borderColor: '#00f3ff', height: isMobile ? '48px' : 'auto' }}
                        >
                          Previous
                        </Button>
                        <Typography className="page-text" sx={{ color: '#fff' }}>Page {page}</Typography>
                        <Button
                          variant="outlined"
                          onClick={() => setPage((prev) => prev + 1)}
                          sx={{ color: '#00f3ff', borderColor: '#00f3ff', height: isMobile ? '48px' : 'auto' }}
                        >
                          Next
                        </Button>
                      </Box>

                      {selectedCommunity && (
                        <Box className="community-popup-overlay">
                          <Box className="community-popup">
                            <Typography variant="h4">Projects in {selectedCommunity.name}</Typography>
                            <Box className="community-projects-list">
                              {communityProjects.length > 0 ? communityProjects.map((project) => (
                                <Paper key={project.id} className="project-card">
                                  <Typography variant="h5">{project.name}</Typography>
                                  <Typography variant="body2">{project.description}</Typography>
                                  <Button
                                    variant="contained"
                                    onClick={() => {
                                        navigate(`/visualizer/${project.id}`);
                                    }}
                                >
                                    Open Project
                                </Button>
                            </Paper>
                        )) : <Typography>No projects in this community yet</Typography>}
                    </Box>
                    <Button
                        variant="outlined"
                        onClick={() => setSelectedCommunity(null)}
                    >
                        Close
                    </Button>
                </Box>
            </Box>
        )}
    </Box>
);
};

export default Communities;