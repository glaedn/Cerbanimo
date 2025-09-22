import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import theme from '../../styles/theme';

const TokenAndAffinitySummary = ({ tokens = 0, affinities = [] }) => {
  const validAffinities = Array.isArray(affinities) ? affinities : [];

  return (
    <Paper sx={{ 
      p: '1rem',
      bgcolor: '#1C1C1E',
      color: '#FFFFFF'
    }}>
      <Typography variant="h6" sx={{ color: '#00F3FF', mb: '1rem' }}>
        {`${theme.terminology.cotokens} Earned: ${tokens}`}
      </Typography>
      <Box mt={2}>
        {validAffinities.map((affinity) => (
          <Box 
            key={affinity.id || affinity.affinity_id || affinity.affinity_name || affinity.name}
            sx={{ 
              backgroundColor: 'rgba(0, 243, 255, 0.2)',
              border: '1px solid #00F3FF',
              padding: '1rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              color: '#FFFFFF'
            }}
          >
            <Typography variant="h6" sx={{ color: '#FFFFFF' }}>
              {affinity.affinity_name || affinity.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#FF5CA2' }}>
              {`${theme.terminology.cotokens}: ${affinity.tokens || 0}`}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default TokenAndAffinitySummary;