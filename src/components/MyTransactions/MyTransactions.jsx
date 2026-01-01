// src/components/MyTransactions/MyTransactions.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Card, CardContent, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Divider } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const MyTransactions = ({ communityId }) => {
  const [transactions, setTransactions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessTokenSilently } = useAuth0();

  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

  // Fetch User ID first
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/profile`, {
          params: { sub: user.sub, email: user.email, name: user.name },
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserId(response.data.id);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError('Could not fetch user profile to load transactions.');
      }
    };
    fetchUserProfile();
  }, [user, getAccessTokenSilently]);

  // Fetch transactions once we have userId and communityId
  useEffect(() => {
    if (!communityId || !userId) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/rewards/transactions/${userId}/${communityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTransactions(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch transaction history.');
        console.error("Error fetching transactions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [communityId, userId, getAccessTokenSilently]);

  return (
    <Box className="hub-grid-item wide-item">
      <Card className="hub-card">
        <CardContent>
          <ReceiptLongIcon className="hub-icon" />
          <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>
            My Community Transactions
          </Typography>

          {isLoading ? (
            <CircularProgress sx={{ mt: 2 }} />
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          ) : (
            <List sx={{ mt: 2 }}>
              {transactions.length === 0 ? (
                <Typography sx={{ color: 'var(--hud-text-secondary)' }}>You have no transactions in this community.</Typography>
              ) : (
                transactions.map((tx, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={`${tx.good_name}`}
                        secondary={`Date: ${new Date(tx.date).toLocaleString()}`}
                        primaryTypographyProps={{ color: 'var(--hud-text-color)' }}
                        secondaryTypographyProps={{ color: 'var(--hud-text-secondary)' }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          color: tx.mode === 'spend' ? 'var(--hud-error-color)' : 'var(--hud-success-color)',
                          fontWeight: 'bold'
                        }}
                      >
                        {tx.mode === 'spend' ? '-' : '+'} {tx.tokens} Tokens
                      </Typography>
                    </ListItem>
                    {index < transactions.length - 1 && <Divider sx={{ borderColor: 'var(--hud-border-color)' }} />}
                  </React.Fragment>
                ))
              )}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MyTransactions;
