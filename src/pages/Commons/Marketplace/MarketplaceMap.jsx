import React from 'react';
import { Box, Typography } from '@mui/material';
import { Map as MapIcon, Crosshair } from 'lucide-react';

const MarketplaceMap = () => {
  return (
    <Box className="marketplace-map-container" sx={{ height: '500px', position: 'relative' }}>
      <div className="discovery-section-header">
        <h3>GEOGRAPHIC_COORDINATION</h3>
      </div>

      <Box className="glass-panel" sx={{
        height: 'calc(100% - 40px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Placeholder for actual map integration */}
        <MapIcon size={64} color="rgba(95, 240, 255, 0.2)" />
        <Typography sx={{ mt: 2, fontFamily: 'Orbitron', color: 'rgba(95, 240, 255, 0.4)', fontSize: '0.8rem' }}>
          SPATIAL_ENGINE_INITIALIZING...
        </Typography>

        <Box sx={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          color: '#ff3232',
          animation: 'pulse 2s infinite'
        }}>
          <Crosshair size={24} />
        </Box>

        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 0.8; }
            }
          `}
        </style>
      </Box>
    </Box>
  );
};

export default MarketplaceMap;
