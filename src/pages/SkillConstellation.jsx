import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import SkillGalaxyPanel from '../components/HUD/panels/SkillGalaxyPanel';
import theme from '../styles/theme';

const SkillConstellation = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  return (
    <Box
      className="glass-panel"
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '80vh',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 0,
        position: 'relative'
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 243, 255, 0.1)',
          background: 'rgba(10, 10, 46, 0.2)'
        }}
      >
        <IconButton
          onClick={() => navigate('/orbit')}
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
          SKILL_CONSTELLATION
        </Typography>
      </Box>
      <Box sx={{ flex: 1, position: 'relative', minHeight: '500px' }}>
        <SkillGalaxyPanel isFullPage={true} userId={userId} />
      </Box>
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', borderTop: '1px solid rgba(0, 243, 255, 0.1)' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/orbit/skill-library')}
          sx={{
            borderColor: '#ff5ca2',
            color: '#ff5ca2',
            fontFamily: 'Orbitron',
            '&:hover': {
              borderColor: '#00f3ff',
              color: '#00f3ff',
              background: 'rgba(0, 243, 255, 0.05)'
            }
          }}
        >
          OPEN_SKILL_LIBRARY
        </Button>
      </Box>
    </Box>
  );
};

export default SkillConstellation;
