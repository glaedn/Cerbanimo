import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import SkillGalaxyPanel from '../components/HUD/panels/SkillGalaxyPanel';
import theme from '../styles/theme';

const SkillConstellation = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        bgcolor: '#0A0A2E',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1200
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 243, 255, 0.3)',
          bgcolor: 'rgba(10, 10, 46, 0.9)'
        }}
      >
        <IconButton
          onClick={() => navigate('/profile')}
          sx={{ color: '#00F3FF', mr: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Orbitron',
            color: '#00F3FF',
            textShadow: '0 0 10px #00F3FF'
          }}
        >
          SKILL CONSTELLATION
        </Typography>
      </Box>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <SkillGalaxyPanel isFullPage={true} userId={userId} />
      </Box>
    </Box>
  );
};

export default SkillConstellation;
