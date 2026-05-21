import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import './Marketplace.css';

const MarketplacePage = ({ crisisMode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabValue = () => {
    const path = location.pathname.split('/').pop();
    switch (path) {
      case 'discover': return 0;
      case 'nearby': return 1;
      case 'missions': return 2;
      case 'needs': return 3;
      case 'offers': return 4;
      case 'logistics': return 5;
      case 'activity': return 6;
      default: return 0;
    }
  };

  const handleTabChange = (event, newValue) => {
    const paths = ['discover', 'nearby', 'missions', 'needs', 'offers', 'logistics', 'activity'];
    navigate(`/commons/marketplace/${paths[newValue]}`);
  };

  return (
    <Box className="marketplace-shell">
      <div className="marketplace-header">
        <span className="mode-kicker" style={{ color: crisisMode ? '#ff3232' : '#ffae6d' }}>
          {crisisMode ? 'EMERGENCY_MARKETPLACE' : 'COMMONS_MARKETPLACE'}
        </span>
        <h2 style={{ color: crisisMode ? '#ff3232' : '#ffae6d' }}>
          {crisisMode ? 'CRISIS_COORDINATION_ACTIVE' : 'Civic Coordination Ecosystem'}
        </h2>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
        <Tabs
          value={getTabValue()}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#ffae6d' },
            '& .MuiTab-root': {
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'Orbitron',
              fontSize: '0.8rem'
            },
            '& .Mui-selected': { color: '#ffae6d !important' }
          }}
        >
          <Tab label="DISCOVER" />
          <Tab label="NEARBY" />
          <Tab label="MISSIONS" />
          <Tab label="NEEDS" />
          <Tab label="OFFERS" />
          <Tab label="LOGISTICS" />
          <Tab label="ACTIVITY" />
        </Tabs>
      </Box>

      <div className="marketplace-content">
        <Outlet />
      </div>
    </Box>
  );
};

export default MarketplacePage;
