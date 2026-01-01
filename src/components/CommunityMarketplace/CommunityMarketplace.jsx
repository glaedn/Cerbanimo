// src/components/CommunityMarketplace/CommunityMarketplace.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, CardActions, CardContent, Typography, TextField, Button, Box, CircularProgress, Alert, Snackbar } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MuiAlert from '@mui/material/Alert';

const CommunityMarketplace = ({ communityId }) => {
  const [goods, setGoods] = useState([]);
  const [newGood, setNewGood] = useState({ name: '', description: '', price: '' });
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const { user, getAccessTokenSilently } = useAuth0();

  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

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
      setError('Could not fetch user profile.');
    }
  };

  const fetchData = async () => {
    if (!communityId || !userId) return;
    setIsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const goodsResponse = await axios.get(`${apiBaseUrl}/goods/community/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoods(Array.isArray(goodsResponse.data) ? goodsResponse.data : []);
      const balanceResponse = await axios.get(`${apiBaseUrl}/rewards/balance/${userId}/${communityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(balanceResponse.data.spendable_balance);
      setError(null);
    } catch (err) {
      setError('Failed to fetch marketplace data. Please try again later.');
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user, getAccessTokenSilently]);

  useEffect(() => {
    fetchData();
  }, [communityId, userId, getAccessTokenSilently]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGood(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newGood.name || !newGood.price) {
      setSnackbar({ open: true, message: 'Please provide a name and a price.', severity: 'error' });
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const payload = { ...newGood, communityId: parseInt(communityId), price: parseInt(newGood.price) };
      await axios.post(`${apiBaseUrl}/goods`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewGood({ name: '', description: '', price: '' });
      setSnackbar({ open: true, message: 'Good listed successfully!', severity: 'success' });
      fetchData(); // Refresh data
    } catch (err) {
      setError('Failed to list new good.');
      console.error("Error creating good:", err);
    }
  };

  const handlePurchase = async (goodId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${apiBaseUrl}/goods/${goodId}/purchase`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: 'Purchase successful!', severity: 'success' });
      fetchData(); // Refresh data
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Purchase failed.', severity: 'error' });
      console.error("Error purchasing good:", err);
    }
  };

  const handleDelete = async (goodId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${apiBaseUrl}/goods/${goodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnackbar({ open: true, message: 'Listing removed successfully.', severity: 'success' });
      fetchData(); // Refresh data
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to remove listing.', severity: 'error' });
      console.error("Error deleting good:", err);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box className="hub-grid-item wide-item">
      <Card className="hub-card">
        <CardContent>
          <StorefrontIcon className="hub-icon" />
          <Typography variant="h5" sx={{ color: 'var(--hud-text-primary)', textShadow: '0 0 5px var(--hud-glow-color)' }}>
            Community Marketplace
          </Typography>
          <Typography variant="h6" sx={{ color: 'var(--hud-text-secondary)', mb: 2 }}>
            Your Spendable Balance: {balance} Tokens
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ color: 'var(--hud-text-primary)', mb: 1 }}>List a New Good</Typography>
            <TextField label="Good Name" name="name" value={newGood.name} onChange={handleInputChange} required fullWidth sx={{ mb: 1 }} />
            <TextField label="Description" name="description" value={newGood.description} onChange={handleInputChange} fullWidth multiline rows={2} sx={{ mb: 1 }} />
            <TextField label="Price in Tokens" name="price" type="number" value={newGood.price} onChange={handleInputChange} required fullWidth sx={{ mb: 2 }} />
            <Button type="submit" variant="contained" color="primary">List Good</Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="h6" sx={{ color: 'var(--hud-text-primary)', mb: 2 }}>Available Goods</Typography>
          {isLoading ? (
            <CircularProgress />
          ) : (
            <Box className="goods-grid">
              {goods.map(good => (
                <Card key={good.id} className="good-item-card" sx={{ border: '1px solid var(--hud-border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'var(--hud-text-color)' }}>{good.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'var(--hud-text-secondary)', mb: 1 }}>{good.description}</Typography>
                    <Typography variant="body1" sx={{ color: 'var(--hud-primary-color)', fontWeight: 'bold' }}>Price: {good.price} tokens</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--hud-text-secondary)' }}>Seller: {good.seller_name}</Typography>
                  </CardContent>
                  <CardActions>
                    {good.seller_id === userId ? (
                      <Button size="small" color="error" onClick={() => handleDelete(good.id)}>Remove</Button>
                    ) : (
                      <Button size="small" color="primary" onClick={() => handlePurchase(good.id)}>Purchase</Button>
                    )}
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <MuiAlert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default CommunityMarketplace;
