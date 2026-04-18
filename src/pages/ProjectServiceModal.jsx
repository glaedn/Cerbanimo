import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
} from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#1c1c1e',
  border: '2px solid #00F3FF',
  boxShadow: '0 0 15px rgba(0, 243, 255, 0.5)',
  p: 4,
  borderRadius: 2,
  color: '#FFFFFF',
  fontFamily: 'Orbitron, sans-serif',
};

const ProjectServiceModal = ({ open, onClose, project, communities, onSave }) => {
  const [isService, setIsService] = useState(false);
  const [price, setPrice] = useState(0);
  const [visibility, setVisibility] = useState([]);

  useEffect(() => {
    if (project) {
      setIsService(project.is_service || false);
      setPrice(project.service_price || 0);
      setVisibility(project.service_visibility || []);
    }
  }, [project, open]);

  const handleToggleVisibility = (option) => {
    setVisibility((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const handleSave = () => {
    if (isService && visibility.length === 0) {
      alert('Please select at least one visibility option to enable the service.');
      return;
    }
    onSave({
      is_service: isService,
      service_price: parseInt(price, 10),
      service_visibility: visibility,
    });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h5" sx={{ mb: 2, color: '#00F3FF', textShadow: '0 0 10px rgba(0, 243, 255, 0.7)' }}>
          SERVICE SETTINGS
        </Typography>
        <Divider sx={{ mb: 2, bgcolor: 'rgba(0, 243, 255, 0.3)' }} />

        <FormControlLabel
          control={
            <Checkbox
              checked={isService}
              onChange={(e) => setIsService(e.target.checked)}
              sx={{ color: '#00F3FF', '&.Mui-checked': { color: '#00F3FF' } }}
            />
          }
          label="DESIGNATE AS SERVICE"
          sx={{ mb: 2 }}
        />

        {isService && (
          <>
            <TextField
              fullWidth
              label="SERVICE PRICE (COMMUNITY TOKENS)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              variant="outlined"
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  color: '#FFFFFF',
                  '& fieldset': { borderColor: '#444444' },
                  '&:hover fieldset': { borderColor: '#00F3FF' },
                  '&.Mui-focused fieldset': { borderColor: '#00F3FF' },
                },
                '& .MuiInputLabel-root': { color: '#CCCCCC' },
              }}
            />

            <Typography variant="subtitle1" sx={{ mb: 1, color: '#00F3FF' }}>
              ADVERTISE ON:
            </Typography>
            <FormGroup sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibility.includes('profile')}
                    onChange={() => handleToggleVisibility('profile')}
                    sx={{ color: '#00F3FF', '&.Mui-checked': { color: '#00F3FF' } }}
                  />
                }
                label="My Profile"
              />
              {communities.map((community) => (
                <FormControlLabel
                  key={community.id}
                  control={
                    <Checkbox
                      checked={visibility.includes(`community:${community.id}`)}
                      onChange={() => handleToggleVisibility(`community:${community.id}`)}
                      sx={{ color: '#00F3FF', '&.Mui-checked': { color: '#00F3FF' } }}
                    />
                  }
                  label={community.name}
                />
              ))}
            </FormGroup>
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={onClose} sx={{ color: '#CCCCCC' }}>
            CANCEL
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              background: 'linear-gradient(45deg, #00F3FF, #4DABF7)',
              color: '#000000',
              fontWeight: 'bold',
            }}
          >
            SAVE PROTOCOL
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ProjectServiceModal;
