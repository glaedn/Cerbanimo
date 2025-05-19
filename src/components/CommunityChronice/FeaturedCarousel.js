import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const FeaturedCarousel = ({ featured = [] }) => (
  <Box sx={{ overflowX: 'auto', display: 'flex', gap: 2, pb: 2 }}>
    {featured.map((item, index) => (
      <Card key={index} sx={{ minWidth: 250, bgcolor: '#222', color: '#fff' }}>
        <CardContent>
          <Typography variant="h6">{item.title}</Typography>
          <Typography variant="body2" color="text.secondary">{item.summary}</Typography>
        </CardContent>
      </Card>
    ))}
  </Box>
);

export default FeaturedCarousel;
