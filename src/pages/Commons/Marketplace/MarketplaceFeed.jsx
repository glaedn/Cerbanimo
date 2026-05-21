import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import UnifiedListingCard from './UnifiedListingCard';
import MarketplaceActivityPulse from './MarketplaceActivityPulse';

const MarketplaceFeed = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAccessTokenSilently } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const pathParts = location.pathname.split('/');
        const type = pathParts[pathParts.length - 1];

        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/marketplace/discover`, {
          params: { type: type !== 'discover' ? type : undefined },
          headers: { Authorization: `Bearer ${token}` }
        });
        setEntries(response.data);
      } catch (err) {
        console.error('Failed to fetch marketplace discovery:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDiscovery();
  }, [getAccessTokenSilently]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress sx={{ color: '#ffae6d' }} />
      </Box>
    );
  }

  return (
    <div className="marketplace-feed">
      <div className="discovery-section">
        <div className="discovery-section-header">
          <h3>COORDINATION_PULSE</h3>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            PRIORITIZED BY RELEVANCE & URGENCY
          </Typography>
        </div>

        <div className="listing-grid">
          {entries.length > 0 ? (
            entries.map(entry => (
              <UnifiedListingCard key={`${entry.entry_type}-${entry.id}`} entry={entry} />
            ))
          ) : (
            <Typography sx={{ py: 4, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              NO ACTIVE COORDINATION SIGNALS DETECTED
            </Typography>
          )}
        </div>
      </div>

      <div className="discovery-section">
        <MarketplaceActivityPulse />
      </div>
    </div>
  );
};

export default MarketplaceFeed;
