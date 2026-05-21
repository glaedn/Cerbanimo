import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Truck, Archive, MapPin, Navigation } from 'lucide-react';

const LogisticsCoordination = () => {
  const logisticsPending = [
    { id: 1, type: 'transport', title: 'Solar Array 4 Delivery', from: 'Sector 7', to: 'Community Garden B' },
    { id: 2, type: 'storage', title: 'Seed Reserve Holding', location: 'Deep Storage Vault 1' },
  ];

  return (
    <div className="logistics-coordination">
      <div className="discovery-section-header">
        <h3>LOGISTICS_COMMAND</h3>
      </div>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {logisticsPending.map(item => (
          <Paper key={item.id} className="glass-panel" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{
              p: 1.5,
              bgcolor: 'rgba(95, 240, 255, 0.1)',
              borderRadius: '8px',
              color: '#5ff0ff'
            }}>
              {item.type === 'transport' ? <Truck size={24} /> : <Archive size={24} />}
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontFamily: 'Orbitron', fontSize: '0.9rem', color: '#fff' }}>
                {item.title.toUpperCase()}
              </Typography>
              <Box display="flex" gap={1} alignItems="center" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', mt: 0.5 }}>
                <MapPin size={12} />
                <span>{item.from ? `${item.from} -> ${item.to}` : item.location}</span>
              </Box>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Navigation size={14} />}
              sx={{
                borderColor: 'rgba(95, 240, 255, 0.3)',
                color: '#5ff0ff',
                fontFamily: 'Orbitron',
                fontSize: '0.65rem'
              }}
            >
              COORDINATE
            </Button>
          </Paper>
        ))}
      </Box>
    </div>
  );
};

export default LogisticsCoordination;
