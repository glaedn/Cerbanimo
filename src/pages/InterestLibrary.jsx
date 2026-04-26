import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../styles/theme';
import './InterestLibrary.css';
import { toast } from 'react-hot-toast';

const InterestLibrary = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedInterests, setSelectedInterests] = useState(new Set());
  const [initialInterests, setInitialInterests] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGroupedInterests();
    fetchUserProfile();
  }, []);

  const fetchGroupedInterests = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/interests/grouped`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching grouped interests:', err);
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data);

      const interestNames = new Set((response.data.interests || []).map(i => typeof i === 'string' ? JSON.parse(i).name : i.name));
      setSelectedInterests(interestNames);
      setInitialInterests(new Set(interestNames));
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleInterest = (interestName) => {
    const newSelected = new Set(selectedInterests);
    if (newSelected.has(interestName)) {
      newSelected.delete(interestName);
    } else {
      newSelected.add(interestName);
    }
    setSelectedInterests(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();

      // We need to update the entire interests array on the profile
      const updatedInterests = Array.from(selectedInterests).map(name => ({ name }));

      const formData = new FormData();
      formData.append('username', userProfile.username);
      formData.append('skills', JSON.stringify(userProfile.skills));
      formData.append('interests', JSON.stringify(updatedInterests));
      formData.append('contact_links', JSON.stringify(userProfile.contact_links));
      formData.append('user_id', userProfile.id);

      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setInitialInterests(new Set(selectedInterests));
      toast.success('Interests updated successfully');
    } catch (err) {
      console.error('Error saving interests:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (selectedInterests.size !== initialInterests.size) return true;
    for (let name of selectedInterests) {
      if (!initialInterests.has(name)) return true;
    }
    return false;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#0A0A2E' }}>
        <CircularProgress sx={{ color: theme.colors.primary }} />
      </Box>
    );
  }

  return (
    <Box className="interest-library-container">
      <Box className="interest-library-header">
        <IconButton onClick={() => navigate('/profile')} sx={{ color: theme.colors.primary }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontFamily: 'Orbitron', color: theme.colors.primary, textShadow: `0 0 10px ${theme.colors.primary}` }}>
          INTEREST LIBRARY
        </Typography>
      </Box>

      <Box className="interest-library-content">
        {categories.map((cat) => (
          <Box key={cat.category} sx={{ mb: 2 }}>
            <Box
              className="category-header"
              onClick={() => toggleCategory(cat.category)}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                backgroundColor: 'rgba(0, 243, 255, 0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                border: `1px solid ${theme.colors.primary}33`
              }}
            >
              <Typography variant="h6" sx={{ fontFamily: 'Orbitron', color: theme.colors.primary }}>
                {cat.category || 'Uncategorized'}
              </Typography>
              {expandedCategories.has(cat.category) ? <ExpandLessIcon sx={{ color: theme.colors.primary }} /> : <ExpandMoreIcon sx={{ color: theme.colors.primary }} />}
            </Box>

            {expandedCategories.has(cat.category) && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, p: 1 }}>
                {cat.interests.map((interest) => {
                  const isSelected = selectedInterests.has(interest.name);
                  return (
                    <Box
                      key={interest.id}
                      onClick={() => toggleInterest(interest.name)}
                      className={`interest-chip ${isSelected ? 'selected' : ''}`}
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: '20px',
                        border: `2px solid ${isSelected ? theme.colors.primary : 'rgba(255, 255, 255, 0.2)'}`,
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? theme.colors.primary : '#FFF',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 0 10px ${theme.colors.primary}66` : 'none',
                        '&:hover': {
                          backgroundColor: isSelected ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'Orbitron', fontWeight: 500 }}>
                        {interest.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {hasChanges() && (
        <Box className="save-changes-container">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              backgroundColor: theme.colors.primary,
              color: '#0A0A2E',
              fontFamily: 'Orbitron',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: theme.colors.primary,
                boxShadow: `0 0 15px ${theme.colors.primary}`,
              }
            }}
          >
            {saving ? <CircularProgress size={24} sx={{ color: '#0A0A2E' }} /> : 'SAVE CHANGES'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default InterestLibrary;
