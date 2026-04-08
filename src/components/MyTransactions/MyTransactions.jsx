// src/components/MyTransactions/MyTransactions.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  CircularProgress, Chip, Divider
} from '@mui/material';
import { CheckCircle, Clock, ArrowRightLeft, User, Package } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const MyTransactions = () => {
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently } = useAuth0();

  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/goods/transactions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
      } catch (err) {
        setError('Failed to fetch transactions.');
        console.error("Error fetching transactions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [user, getAccessTokenSilently, apiBaseUrl]);

  const handleVerify = async (transactionId) => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const token = await getAccessTokenSilently();
      const response = await axios.post(`${apiBaseUrl}/goods/transactions/${transactionId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(transactions.map(t => t.id === transactionId ? response.data.transaction : t));
      if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
      alert('Exchange verified on the ledger.');
    } catch (err) {
      setError('Verification failed. Please try again.');
    }
  };

  if (isLoading) return <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: '#00ffff' }} /></Box>;

  return (
    <Box sx={{ color: '#e0e0e0' }}>
      <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#ff00ff', mb: 3 }}>
        TRANSACTION_LOG
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2, p: 1, border: '1px solid #ff3232', borderRadius: 1, bgcolor: 'rgba(255, 50, 50, 0.1)' }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2}>
        {transactions.length === 0 ? (
          <Grid item xs={12}>
            <Typography sx={{ opacity: 0.5, textAlign: 'center', py: 4 }}>NO ACTIVE TRANSFERS RECORDED</Typography>
          </Grid>
        ) : (
          transactions.map(tx => {
            const isBuyer = tx.buyer_id === user.sub;
            const canVerify = (isBuyer && !tx.buyer_verified) || (!isBuyer && !tx.seller_verified);

            return (
              <Grid item xs={12} key={tx.id}>
                <Card sx={{ bgcolor: '#111', border: '1px solid #333', color: '#fff' }}>
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Package size={18} style={{ color: '#ff00ff' }} />
                        <Typography variant="h6" sx={{ fontFamily: 'Orbitron', fontSize: '1rem' }}>
                          {tx.good_name.toUpperCase()}
                        </Typography>
                      </Box>
                      <Chip
                        label={tx.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: tx.status === 'fulfilled' ? 'rgba(0, 215, 135, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                          color: tx.status === 'fulfilled' ? '#00d787' : '#ffa500',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: 'gray', display: 'block' }}>ROLE</Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ArrowRightLeft size={14} />
                          <Typography variant="body2">{isBuyer ? 'RECIPIENT' : 'PROVIDER'}</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: 'gray', display: 'block' }}>VERIFICATION</Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          { (isBuyer ? tx.buyer_verified : tx.seller_verified) ? <CheckCircle size={14} color="#00d787" /> : <Clock size={14} color="#ffa500" /> }
                          <Typography variant="body2" sx={{ color: (isBuyer ? tx.buyer_verified : tx.seller_verified) ? '#00d787' : '#ffa500' }}>
                            { (isBuyer ? tx.buyer_verified : tx.seller_verified) ? 'CONFIRMED' : 'WAITING' }
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {tx.status === 'pending' && canVerify && (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<CheckCircle size={18} />}
                        onClick={() => handleVerify(tx.id)}
                        sx={{
                          bgcolor: '#ff00ff',
                          color: '#000',
                          fontWeight: 'bold',
                          height: isMobile ? '48px' : 'auto',
                          '&:hover': { bgcolor: '#cc00cc' }
                        }}
                      >
                        VERIFY EXCHANGE
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })
        )}
      </Grid>
    </Box>
  );
};

export default MyTransactions;
