import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  FormGroup,
  Checkbox,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const ServiceSettingsModal = ({ open, onClose, project, onUpdate, userId }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [isService, setIsService] = useState(project?.is_service || false);
  const [price, setPrice] = useState(project?.service_price || 0);
  const [visibility, setVisibility] = useState(project?.service_visibility || []);
  const [userCommunities, setUserCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setIsService(project?.is_service || false);
      setPrice(project?.service_price || 0);
      setVisibility(project?.service_visibility || []);
      fetchUserCommunities();
    }
  }, [open, project]);

  const fetchUserCommunities = async () => {
    if (!userId) return;
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserCommunities(response.data || []);
    } catch (err) {
      console.error('Failed to fetch communities', err);
    }
  };

  const handleVisibilityChange = (option) => {
    if (visibility.includes(option)) {
      setVisibility(visibility.filter(v => v !== option));
    } else {
      setVisibility([...visibility, option]);
    }
  };

  const handleSave = async () => {
    if (isService && visibility.length === 0) {
      setError('At least one visibility option must be chosen if this is a service.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
      });

      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/projects/${project.id}`, {
        ...project,
        is_service: isService,
        service_price: price,
        service_visibility: visibility
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onUpdate({
        is_service: isService,
        service_price: price,
        service_visibility: visibility
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update service settings');
    } finally {
      setLoading(false);
    }
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: '#1a1a1a',
    border: '2px solid #00f3ff',
    boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
    p: 4,
    color: 'white',
    borderRadius: '8px',
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" sx={{ mb: 3, fontFamily: 'Orbitron', color: '#00f3ff' }}>
          Service Settings
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControlLabel
          control={
            <Switch
              checked={isService}
              onChange={(e) => setIsService(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#00f3ff' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00f3ff' }
              }}
            />
          }
          label="Mark as a Service"
          sx={{ mb: 2 }}
        />

        {isService && (
          <>
            <TextField
              fullWidth
              label="Price (Galactic Credits)"
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              variant="outlined"
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#00f3ff' },
                  '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
                },
                '& .MuiInputLabel-root': { color: '#888' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#00f3ff' },
              }}
            />

            <Typography variant="subtitle1" sx={{ mb: 1, color: '#00f3ff' }}>
              Visibility
            </Typography>
            <FormGroup sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibility.includes('profile')}
                    onChange={() => handleVisibilityChange('profile')}
                    sx={{ color: '#00f3ff', '&.Mui-checked': { color: '#00f3ff' } }}
                  />
                }
                label="Public Profile"
              />
              {userCommunities.map((community) => (
                <FormControlLabel
                  key={community.id}
                  control={
                    <Checkbox
                      checked={visibility.includes(community.id.toString())}
                      onChange={() => handleVisibilityChange(community.id.toString())}
                      sx={{ color: '#00f3ff', '&.Mui-checked': { color: '#00f3ff' } }}
                    />
                  }
                  label={`Community: ${community.name}`}
                />
              ))}
            </FormGroup>
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} sx={{ color: '#888' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{
              background: 'linear-gradient(45deg, #00f3ff, #0066ff)',
              color: 'black',
              fontWeight: 'bold',
              '&:hover': { background: 'linear-gradient(45deg, #0066ff, #00f3ff)' }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Settings'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ServiceSettingsModal;
