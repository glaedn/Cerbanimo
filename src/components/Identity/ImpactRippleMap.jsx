import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const ImpactRippleMap = ({ data }) => {
  const defaultRipples = [
    { id: 1, action: 'Repaired Community Fridge', scope: 'Direct' },
    { id: 2, action: 'Prevented 50kg Food Waste', scope: 'Secondary' },
    { id: 3, action: 'Supported 12 Families', scope: 'Ecosystem' },
    { id: 4, action: 'Regional Trust Increased by 5%', scope: 'Systemic' }
  ];

  const displayRipples = data && data.length > 0 ? data.map(item => ({
    id: item.id,
    action: item.description,
    scope: item.propagation_type || 'Secondary'
  })) : defaultRipples;

  return (
    <Box sx={{ p: 3, bgcolor: 'rgba(255, 92, 162, 0.05)', borderRadius: 2, border: '1px solid rgba(255, 92, 162, 0.2)' }}>
      <Typography variant="overline" sx={{ color: '#ff5ca2', letterSpacing: 2, mb: 3, display: 'block' }}>
        IMPACT_PROPAGATION_CHAIN
      </Typography>

      <Stack spacing={2}>
        {displayRipples.map((ripple, index) => (
          <Box
            key={ripple.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              ml: index * 3,
              p: 1.5,
              borderLeft: `2px solid rgba(255, 92, 162, ${1 - index * 0.2})`,
              bgcolor: `rgba(255, 92, 162, ${0.1 - index * 0.02})`
            }}
          >
            <TrendingUpIcon sx={{ color: '#ff5ca2', fontSize: '1rem' }} />
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: '0.6rem' }}>
                {ripple.scope.toUpperCase()} EFFECT
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {ripple.action}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default ImpactRippleMap;
