import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Activity } from 'lucide-react';

const MarketplaceActivityPulse = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/marketplace/activity`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActivity(response.data);
      } catch (err) {
        console.error('Failed to fetch marketplace activity:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [getAccessTokenSilently]);

  if (loading) return <CircularProgress size={20} sx={{ color: '#ffae6d' }} />;

  return (
    <div className="activity-pulse">
      <div className="discovery-section-header">
        <Box display="flex" alignItems="center" gap={1}>
          <Activity size={16} color="#ffae6d" />
          <h3>MARKETPLACE_PULSE</h3>
        </Box>
      </div>
      <Box className="glass-panel" sx={{ p: 0, overflow: 'hidden' }}>
        {activity.map((item, idx) => (
          <div key={idx} className="activity-item">
            <Box display="flex" flexDirection="column">
              <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                {item.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                {new Date(item.created_at).toLocaleTimeString()}
              </Typography>
            </Box>
            <span className="activity-type">{item.activity_type.replace('_', ' ').toUpperCase()}</span>
          </div>
        ))}
      </Box>
    </div>
  );
};

export default MarketplaceActivityPulse;
