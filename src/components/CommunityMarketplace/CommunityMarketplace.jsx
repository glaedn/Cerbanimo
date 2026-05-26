// src/components/CommunityMarketplace/CommunityMarketplace.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  TextField, CircularProgress, Chip, Divider, Modal,
  IconButton, Tooltip
} from '@mui/material';
import { ShoppingCart, Plus, Info, User, Tag } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { toast } from 'react-hot-toast';

const CommunityMarketplace = ({ communityId }) => {
  const isMobile = useIsMobile();
  const [goods, setGoods] = useState([]);
  const [newGood, setNewGood] = useState({ name: '', description: '', price: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchGoods = async () => {
      try {
        setIsLoading(true);
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${apiBaseUrl}/goods/community/${communityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGoods(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        // If 404, just set empty goods
        if (err.response?.status === 404) {
            setGoods([]);
        } else {
            setError('Failed to fetch goods. Please try again later.');
            console.error("Error fetching goods:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (communityId) {
      fetchGoods();
    }
  }, [communityId, getAccessTokenSilently, apiBaseUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGood(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newGood.name || !newGood.price) {
      toast.error('Please provide a name and a price.');
      return;
    }

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
      });
      const payload = { ...newGood, communityId: parseInt(communityId), price: parseInt(newGood.price) };
      const response = await axios.post(`${apiBaseUrl}/goods`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoods(prevGoods => [response.data, ...prevGoods]);
      setNewGood({ name: '', description: '', price: '' });
      setIsModalOpen(false);
      toast.success('Item listed in the marketplace.');
      if (window.navigator.vibrate) window.navigator.vibrate([30, 30]);
    } catch (err) {
      setError('Failed to list new good. Please try again.');
    }
  };

  const handlePurchase = async (goodId) => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const token = await getAccessTokenSilently();
      await axios.post(`${apiBaseUrl}/goods/${goodId}/purchase`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoods(goods.filter(g => g.id !== goodId));
      if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
      toast.success('Purchase initiated! The item is now in escrow.');
    } catch (err) {
      toast.error('Purchase failed. Check balance or availability.');
      setError('Purchase failed. Check balance or availability.');
    }
  };

  return (
    <Box sx={{ color: 'var(--hud-text-color)', mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontFamily: 'var(--hud-header-font)', color: 'var(--hud-primary-color)', textShadow: '0 0 10px var(--hud-glow-color)' }}>
          COMMUNITY MARKETPLACE
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
          sx={{
            color: 'var(--hud-primary-color)',
            borderColor: 'rgba(95, 240, 255, 0.5)',
            height: isMobile ? '44px' : 'auto',
            fontFamily: 'var(--hud-header-font)',
            '&:hover': {
                borderColor: 'var(--hud-primary-color)',
                bgcolor: 'rgba(95, 240, 255, 0.1)',
                boxShadow: '0 0 10px var(--hud-glow-color)'
            }
          }}
        >
          {isMobile ? 'LIST' : 'LIST NEW GOOD'}
        </Button>
      </Box>

      {error && (
        <Typography sx={{ mb: 2, p: 1, border: '1px solid var(--hud-error-color)', borderRadius: 1, bgcolor: 'rgba(255, 65, 54, 0.1)', color: 'var(--hud-error-color)', fontFamily: 'var(--hud-header-font)' }}>
          SYSTEM_ERROR: {error}
        </Typography>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: 'var(--hud-primary-color)' }} /></Box>
      ) : (
        <Grid container spacing={2}>
          {goods.length === 0 ? (
            <Grid item xs={12}>
              <Typography sx={{ color: 'var(--hud-text-secondary)', textAlign: 'center', py: 4 }}>NO GOODS AVAILABLE IN THIS SECTOR</Typography>
            </Grid>
          ) : (
            goods.map(good => (
              <Grid item xs={12} sm={6} key={good.id}>
                <Card className="glass-panel" sx={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(var(--hud-primary-color-rgb), 0.15)',
                  color: 'var(--hud-text-color)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    borderColor: 'var(--hud-primary-color)',
                    boxShadow: '0 0 20px var(--hud-glow-color)',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" sx={{ fontFamily: 'var(--hud-header-font)', color: 'var(--hud-primary-color)', fontSize: '1.1rem' }}>
                        {good.name.toUpperCase()}
                      </Typography>
                      <Chip
                        label={`${good.price} Ȼ`}
                        size="small"
                        sx={{ bgcolor: 'rgba(95, 240, 255, 0.1)', color: 'var(--hud-primary-color)', fontWeight: 'bold', border: '1px solid rgba(95, 240, 255, 0.3)' }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 3, color: 'var(--hud-text-secondary)', minHeight: '3em', lineHeight: 1.6 }}>
                      {good.description}
                    </Typography>

                    <Divider sx={{ my: 2, bgcolor: 'rgba(95, 240, 255, 0.1)' }} />

                    <Box display="flex" alignItems="center" gap={1} mb={3}>
                      <User size={14} style={{ color: 'var(--hud-secondary-color)' }} />
                      <Typography variant="caption" sx={{ color: 'var(--hud-secondary-color)', fontFamily: 'var(--hud-header-font)' }}>
                        PROVIDER: {good.seller_name || 'ANON_CORE'}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ShoppingCart size={18} />}
                      onClick={() => handlePurchase(good.id)}
                      sx={{
                        background: 'linear-gradient(45deg, var(--hud-primary-color), #4DABF7)',
                        color: 'black',
                        fontWeight: 'bold',
                        fontFamily: 'var(--hud-header-font)',
                        height: isMobile ? '48px' : '40px',
                        '&:hover': {
                            background: 'linear-gradient(45deg, #4DABF7, var(--hud-primary-color))',
                            boxShadow: '0 0 15px var(--hud-glow-color)'
                        }
                      }}
                    >
                      PURCHASE
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Modal for listing new good */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <Box className="glass-panel" sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: 500 },
          bgcolor: 'rgba(3, 6, 18, 0.95)',
          border: '1px solid var(--hud-primary-color)',
          p: 4, borderRadius: 2,
          boxShadow: '0 0 40px var(--hud-glow-color)',
          maxHeight: '90vh', overflowY: 'auto',
          backdropFilter: 'blur(20px)'
        }}>
          <Typography variant="h5" sx={{ fontFamily: 'var(--hud-header-font)', color: 'var(--hud-primary-color)', mb: 4, textAlign: 'center' }}>LIST_GOOD_PROTOCOL</Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="GOOD_NAME"
              name="name"
              value={newGood.name}
              onChange={handleInputChange}
              required
              variant="outlined"
              sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      fontFamily: 'var(--hud-header-font)',
                      '& fieldset': { borderColor: 'rgba(95,240,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'var(--hud-primary-color)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--hud-primary-color)' }
                  }
              }}
              InputLabelProps={{ style: { color: 'rgba(95,240,255,0.7)', fontFamily: 'var(--hud-header-font)' } }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="DESCRIPTION"
              name="description"
              value={newGood.description}
              onChange={handleInputChange}
              variant="outlined"
              sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(95,240,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'var(--hud-primary-color)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--hud-primary-color)' }
                  }
              }}
              InputLabelProps={{ style: { color: 'rgba(95,240,255,0.7)', fontFamily: 'var(--hud-header-font)' } }}
            />
            <TextField
              fullWidth
              type="number"
              label="PRICE_IN_CREDITS"
              name="price"
              value={newGood.price}
              onChange={handleInputChange}
              required
              variant="outlined"
              sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      fontFamily: 'var(--hud-header-font)',
                      '& fieldset': { borderColor: 'rgba(95,240,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'var(--hud-primary-color)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--hud-primary-color)' }
                  }
              }}
              InputLabelProps={{ style: { color: 'rgba(95,240,255,0.7)', fontFamily: 'var(--hud-header-font)' } }}
            />

            <Box display="flex" gap={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setIsModalOpen(false)}
                sx={{
                    color: 'var(--hud-error-color)',
                    borderColor: 'var(--hud-error-color)',
                    height: '48px',
                    fontFamily: 'var(--hud-header-font)',
                    '&:hover': {
                        borderColor: 'var(--hud-error-color)',
                        bgcolor: 'rgba(255, 65, 54, 0.1)'
                    }
                }}
              >
                ABORT
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                sx={{
                    background: 'linear-gradient(45deg, var(--hud-primary-color), #4DABF7)',
                    color: '#000',
                    fontWeight: 'bold',
                    height: '48px',
                    fontFamily: 'var(--hud-header-font)',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #4DABF7, var(--hud-primary-color))',
                        boxShadow: '0 0 15px var(--hud-glow-color)'
                    }
                }}
              >
                INITIALIZE_LISTING
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default CommunityMarketplace;
