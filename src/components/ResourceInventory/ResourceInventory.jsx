import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Grid, Card, CardContent, LinearProgress, Chip } from '@mui/material';

const ResourceInventory = () => {
  const [resources, setResources] = useState([
    { id: '1', name: '3D Printer', type: 'Equipment', owner_name: 'Alex', status: 'available' },
    { id: '2', name: 'Co-working Space', type: 'Space', owner_name: 'Project Alpha', status: 'booked' },
    { id: '3', name: 'Software Dev Help', type: 'Skill', owner_name: 'Sara', status: 'available' },
  ]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        [ RESOURCE INVENTORY ]
      </Typography>
      <Typography variant="body1" gutterBottom color="textSecondary">
        "Labor is not the only input. Manage equipment, spaces, and skills."
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {resources.map((resource) => (
          <Grid item xs={12} sm={6} md={4} key={resource.id}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid #4FC3F7' }}>
              <CardContent>
                <Typography variant="h6">{resource.name}</Typography>
                <Typography variant="subtitle2" color="primary">{resource.type}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={`Owner: ${resource.owner_name}`} size="small" sx={{ mr: 1 }} />
                  <Chip
                    label={resource.status.toUpperCase()}
                    size="small"
                    color={resource.status === 'available' ? 'success' : 'warning'}
                  />
                </Box>
                <Button variant="outlined" sx={{ mt: 2, color: '#4FC3F7', borderColor: '#4FC3F7' }}>
                  RESERVE
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ResourceInventory;
