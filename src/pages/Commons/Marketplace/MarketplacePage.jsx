import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Button, Modal, Paper, Typography } from '@mui/material';
import ResourceListingForm from '../../../components/ResourceListingForm/ResourceListingForm';
import NeedDeclarationForm from '../../../components/NeedDeclarationForm/NeedDeclarationForm.jsx';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import theme from '../../../styles/theme';
import './Marketplace.css';

const MarketplacePage = ({ crisisMode }) => {
  const { profile } = useUserProfile();
  const { getAccessTokenSilently } = useAuth0();
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'list-resource') {
      setIsResourceModalOpen(true);
    } else if (params.get('action') === 'declare-need') {
      setIsNeedModalOpen(true);
    }
  }, [window.location.search]);

  const handleResourceSubmit = async (resourceData) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources/add`, {
        ...resourceData,
        ownerUserId: profile.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Resource listed successfully!');
      setIsResourceModalOpen(false);
    } catch (err) {
      console.error('Error listing resource:', err);
      toast.error('Failed to list resource.');
    }
  };

  const handleNeedSubmit = async (needData) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/needs`, {
        ...needData,
        requestor_user_id: profile.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Need declared successfully!');
      setIsNeedModalOpen(false);
    } catch (err) {
      console.error('Error declaring need:', err);
      toast.error('Failed to declare need.');
    }
  };
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
      <div className="marketplace-actions" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => setIsNeedModalOpen(true)}
          sx={{ background: '#5ff0ff', color: '#081429', fontFamily: 'Orbitron' }}
        >
          LIST_NEED
        </Button>
        <Button
          variant="contained"
          onClick={() => setIsResourceModalOpen(true)}
          sx={{ background: '#ffae6d', color: '#081429', fontFamily: 'Orbitron' }}
        >
          LIST_RESOURCE
        </Button>
      </div>

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

      <Modal open={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)}>
        <Paper sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', md: '600px' }, maxHeight: '90vh', overflowY: 'auto',
          bgcolor: '#081429', p: 4, border: '1px solid #ffae6d', borderRadius: '12px'
        }}>
          <Typography variant="h5" sx={{ color: '#ffae6d', fontFamily: 'Orbitron', mb: 3, textAlign: 'center' }}>LIST NEW RESOURCE</Typography>
          <ResourceListingForm onSubmit={handleResourceSubmit} onCancel={() => setIsResourceModalOpen(false)} />
        </Paper>
      </Modal>

      <Modal open={isNeedModalOpen} onClose={() => setIsNeedModalOpen(false)}>
        <Paper sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '90%', md: '600px' }, maxHeight: '90vh', overflowY: 'auto',
          bgcolor: '#081429', p: 4, border: '1px solid #5ff0ff', borderRadius: '12px'
        }}>
          <Typography variant="h5" sx={{ color: '#5ff0ff', fontFamily: 'Orbitron', mb: 3, textAlign: 'center' }}>DECLARE NEW NEED</Typography>
          <NeedDeclarationForm onSubmit={handleNeedSubmit} onCancel={() => setIsNeedModalOpen(false)} loggedInUserId={profile?.id} />
        </Paper>
      </Modal>
    </Box>
  );
};

export default MarketplacePage;
