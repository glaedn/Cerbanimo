import React from 'react';
import TransactionList from '../components/TransactionList/TransactionList';
import { Typography, Container, Box, Paper } from '@mui/material';

const TransactionHistoryPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          My Transaction History
        </Typography>
        <Box>
          <TransactionList />
        </Box>
      </Paper>
    </Container>
  );
};

export default TransactionHistoryPage;
