// src/components/CommunityMarketplace/CommunityMarketplace.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  TextField, CircularProgress, Chip, Divider, Modal,
  IconButton
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
        setError('Failed to fetch goods. Please try again later.');
        console.error("Error fetching goods:", err);
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
    <Box sx={{ color: '#e0e0e0' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#00ffff' }}>
          MARKETPLACE
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
          sx={{
            color: '#00ffff',
            borderColor: 'rgba(0, 255, 255, 0.5)',
            height: isMobile ? '44px' : 'auto'
          }}
        >
          {isMobile ? 'LIST' : 'LIST NEW GOOD'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2, p: 1, border: '1px solid #ff3232', borderRadius: 1, bgcolor: 'rgba(255, 50, 50, 0.1)' }}>
          {error}
        </Typography>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress sx={{ color: '#00ffff' }} /></Box>
      ) : (
        <Grid container spacing={2}>
          {goods.length === 0 ? (
            <Grid item xs={12}>
              <Typography sx={{ opacity: 0.5, textAlign: 'center', py: 4 }}>NO GOODS AVAILABLE IN THIS SECTOR</Typography>
            </Grid>
          ) : (
            goods.map(good => (
              <Grid item xs={12} sm={6} key={good.id}>
                <Card sx={{
                  background: 'rgba(8, 20, 41, 0.4)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(95, 240, 255, 0.15)',
                  color: '#fff',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    borderColor: 'rgba(95, 240, 255, 0.5)',
                    boxShadow: '0 0 20px rgba(95, 240, 255, 0.2)'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" sx={{ fontFamily: 'Orbitron', color: '#00ffff', fontSize: '1rem' }}>
                        {good.name.toUpperCase()}
                      </Typography>
                      <Chip
                        label={`${good.price} Ȼ`}
                        size="small"
                        sx={{ bgcolor: 'rgba(0, 255, 255, 0.1)', color: '#00ffff', fontWeight: 'bold' }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, minHeight: '3em' }}>
                      {good.description}
                    </Typography>

                    <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.1)' }} />

                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <User size={14} style={{ color: '#ff00ff' }} />
                      <Typography variant="caption" sx={{ color: '#ff00ff' }}>
                        PROVIDER: {good.seller_name || 'ANON_CORE'}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ShoppingCart size={18} />}
                      onClick={() => handlePurchase(good.id)}
                      sx={{
                        bgcolor: '#00ffff',
                        color: '#000',
                        fontWeight: 'bold',
                        height: isMobile ? '48px' : 'auto',
                        '&:hover': { bgcolor: '#00cccc' }
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
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? '100%' : 500, height: isMobile ? '100%' : 'auto',
          background: 'rgba(8, 20, 41, 0.9)',
          backdropFilter: 'blur(20px)',
          border: isMobile ? 'none' : '1px solid rgba(95, 240, 255, 0.3)',
          p: isMobile ? 3 : 4, borderRadius: isMobile ? 0 : 4,
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.6)',
          maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto'
        }}>
          <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: '#00ffff', mb: 3 }}>LIST_GOOD_PROTOCOL</Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="GOOD_NAME"
              name="name"
              value={newGood.name}
              onChange={handleInputChange}
              required
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(0,255,255,0.3)' } } }}
              InputLabelProps={{ style: { color: '#00ffff' } }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="DESCRIPTION"
              name="description"
              value={newGood.description}
              onChange={handleInputChange}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(0,255,255,0.3)' } } }}
              InputLabelProps={{ style: { color: '#00ffff' } }}
            />
            <TextField
              fullWidth
              type="number"
              label="PRICE_IN_CREDITS"
              name="price"
              value={newGood.price}
              onChange={handleInputChange}
              required
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(0,255,255,0.3)' } } }}
              InputLabelProps={{ style: { color: '#00ffff' } }}
            />

            <Box display="flex" gap={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setIsModalOpen(false)}
                sx={{ color: '#ff3232', borderColor: '#ff3232', height: isMobile ? '48px' : 'auto' }}
              >
                ABORT
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                sx={{ bgcolor: '#00ffff', color: '#000', fontWeight: 'bold', height: isMobile ? '48px' : 'auto' }}
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
