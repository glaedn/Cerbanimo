import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip } from '@mui/material';

const Constellations = () => {
  const constellations = [
    { id: '1', name: 'Urban Food Mesh', objective: 'Resilient local food supply', entities: ['Gardener Guild', 'City Alpha Project'], status: 'active' },
    { id: '2', name: 'Clean Energy Grid', objective: 'Micro-grid for Block 4', entities: ['Solar Guild', 'Grid Project'], status: 'forming' },
  ];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        [ CONSTELLATION NETWORK ]
      </Typography>
      <Typography variant="body1" gutterBottom color="textSecondary">
        "Temporary alliances between projects and guilds around shared objectives."
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {constellations.map((c) => (
          <Grid item xs={12} md={6} key={c.id}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid #BB86FC' }}>
              <CardContent>
                <Typography variant="h6">{c.name}</Typography>
                <Typography variant="body2" sx={{ my: 1 }}>{c.objective}</Typography>
                <Box sx={{ mt: 2 }}>
                  {c.entities.map(e => <Chip key={e} label={e} size="small" sx={{ mr: 1, mb: 1 }} />)}
                </Box>
                <Chip label={c.status.toUpperCase()} size="small" color="secondary" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Constellations;
