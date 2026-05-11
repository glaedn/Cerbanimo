import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid
} from '@mui/material';
import { useIsMobile } from '../hooks/useIsMobile';
import { motion } from 'framer-motion';
import './Communities.css';

const Communities = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const navigate = useNavigate();

  const matchesSearch = (text, searchTerm) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const fetchCommunities = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/communities`,
        {
          params: { search, page },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const communitiesArray = response.data.communities || [];

      const searchTerm = search.trim();
      const filtered = searchTerm
        ? communitiesArray.filter(c =>
            matchesSearch(c.name || '', searchTerm) ||
            matchesSearch(c.description || '', searchTerm)
          )
        : communitiesArray;

      setCommunities(filtered);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
      setCommunities([]);
    }
  };

  useEffect(() => {
    if (user) fetchCommunities();
  }, [user, page, search]);

  return (
    <div className="communities-container">
      <h1 className="community-page-title">DISCOVER COMMUNITIES</h1>

      {/* SEARCH BAR */}
      <div className="search-bar-container">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search Realms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              borderRadius: '30px',
              '& fieldset': { borderColor: 'rgba(0,243,255,0.3)' },
              '&:hover fieldset': { borderColor: '#00f3ff' }
            }
          }}
        />

        <Button
          onClick={() => navigate('/communitycreation')}
          sx={{
            width: 48,
            height: 48,
            minWidth: 48,
            borderRadius: '50%',
            ml: 2,
            bgcolor: '#00f3ff',
            color: '#000',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          +
        </Button>
      </div>

      {/* COMMUNITY GRID */}
      <Box className="community-list-wrapper">
        <Grid container spacing={3} component={motion.div} layout>
          {communities.length > 0 ? (
            communities.map((community) => (
              <Grid item xs={12} sm={6} md={4} key={community.id}>
                <div className="community-card">
                  <h2 className="community-title">
                    {community.name.toUpperCase()}
                  </h2>

                  <p className="community-description">
                    {community.description}
                  </p>

                  {community.location && (
                    <Typography variant="caption" sx={{ color: '#00f3ff', display: 'block', mb: 1, fontFamily: 'Orbitron', fontSize: '0.7rem' }}>
                      LOCATION: {community.location.coordinates[1].toFixed(4)}, {community.location.coordinates[0].toFixed(4)}
                    </Typography>
                  )}

                  <div className="community-tags">
                    {community.interest_tags?.length ? (
                      community.interest_tags.map((tag, i) => (
                        <span key={i} className="tag-chip">{tag}</span>
                      ))
                    ) : (
                      <span className="no-tags">No tags</span>
                    )}
                  </div>

                  <div className="community-footer">
                    <div className="community-stats">
                      <span className="stat-number">
                        {Array.isArray(community.members)
                          ? community.members.length
                          : 0}
                      </span>
                      <span className="stat-label">POPULATION</span>
                    </div>

                    <button
                      className="join-button"
                      onClick={() =>
                        navigate(`/communityhub/${community.id}`)
                      }
                    >
                      ENTER
                    </button>
                  </div>
                </div>
              </Grid>
            ))
          ) : (
            <Box sx={{ width: '100%', textAlign: 'center', mt: 4 }}>
              <Typography>
                No communities found. Try adjusting your search.
              </Typography>
            </Box>
          )}
        </Grid>

        {/* PAGINATION */}
        <Box className="pagination-container">
          <Button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </Button>

          <Typography>Page {page}</Typography>

          <Button onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </Box>
      </Box>
    </div>
  );
};

export default Communities;