import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { useInView } from 'react-intersection-observer';

const ChronicleGrid = ({ items, loadMore, hasMore }) => {
  const { ref, inView } = useInView({ triggerOnce: false });

  React.useEffect(() => {
    if (inView && hasMore) loadMore();
  }, [inView, hasMore, loadMore]);

  return (
    <Grid container spacing={2}>
      {items.map((item, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ bgcolor: '#1a1a1a', color: '#fff' }}>
            <CardContent>
              <Typography variant="h6">{item.name}</Typography>
              <Typography variant="body2">{item.reflection}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      {hasMore && <Box ref={ref} sx={{ height: 60 }} />}
    </Grid>
  );
};

export default ChronicleGrid;
