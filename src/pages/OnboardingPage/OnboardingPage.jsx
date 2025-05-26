import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Avatar,
  Button,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import theme from '../../styles/theme'; // Custom theme
import './OnboardingPage.css';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [skills, setSkills] = useState([]);
  const [interests, setInterests] = useState([]);
  const [skillsOptions, setSkillsOptions] = useState([]);
  const [interestsOptions, setInterestsOptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`http://localhost:4000/profile/options`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSkillsOptions(response.data.skillsPool || []);
        setInterestsOptions(response.data.interestsPool || []);
        console.log('Fetched skill and interest options:', response.data);
      } catch (err) {
        console.error('Error fetching options:', err);
        setError('Failed to load skill and interest options. Please try refreshing.');
      }
    };
    fetchOptions();
  }, [getAccessTokenSilently]);

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Username is required.');
      setLoading(false);
      return;
    }
    if (skills.length < 3) {
      setError('Please select or add at least 3 skills.');
      setLoading(false);
      return;
    }
    if (interests.length < 3) {
      setError('Please select or add at least 3 interests.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('username', username);
    
    // Ensure skills and interests are arrays of objects with 'name' property
    const formattedSkills = skills.map(skill => (typeof skill === 'string' ? { name: skill } : { name: skill.name }));
    const formattedInterests = interests.map(interest => (typeof interest === 'string' ? { name: interest } : { name: interest.name }));

    formData.append('skills', JSON.stringify(formattedSkills));
    formData.append('interests', JSON.stringify(formattedInterests));

    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(`http://localhost:4000/onboarding/initiate`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Onboarding successful:', response.data);
      // Navigate to dashboard or a specific project page if ID is available
      // For now, navigating to dashboard
      if (response.data.project && response.data.project.projectId) {
        navigate(`/project/${response.data.project.projectId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err.response?.data?.message || 'An error occurred during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="onboarding-page-container" sx={{ bgcolor: theme.colors.background }}>
      <Paper
        component="form"
        onSubmit={handleSubmit}
        className="onboarding-form"
        sx={{ bgcolor: theme.colors.backgroundPaper, color: theme.colors.textPrimary }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', color: theme.colors.primary }}>
          Welcome! Let's set up your profile.
        </Typography>

        {error && <Alert severity="error" className="error-alert">{error}</Alert>}

        <Box className="profile-picture-section">
          <Avatar
            src={profilePicturePreview}
            sx={{ width: 100, height: 100, mb: 1, bgcolor: theme.colors.secondary }}
          >
            {!profilePicturePreview && username.charAt(0).toUpperCase()}
          </Avatar>
          <Button component="label" variant="contained" sx={{ bgcolor: theme.colors.primary, '&:hover': { bgcolor: theme.colors.primaryDark } }}>
            Upload Profile Picture
            <VisuallyHiddenInput type="file" accept="image/*" onChange={handleProfilePictureChange} />
          </Button>
        </Box>

        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          InputLabelProps={{ style: { color: theme.colors.textSecondary } }}
          inputProps={{ style: { color: theme.colors.textPrimary } }}
          sx={{ mb: 2 }}
        />

        <Autocomplete
          multiple
          freeSolo
          options={skillsOptions}
          value={skills}
          onChange={(event, newValue) => {
            setSkills(newValue.map(option => 
              typeof option === 'string' ? { name: option } : option
            ));
          }}
          getOptionLabel={(option) => option.name || option}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option.name || option} {...getTagProps({ index })} sx={{ bgcolor: theme.colors.secondary, color: theme.colors.textPrimary }}/>
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Skills (at least 3)"
              placeholder="Type or select skills"
              InputLabelProps={{ style: { color: theme.colors.textSecondary } }}
            />
          )}
          sx={{ mb: 2 }}
        />

        <Autocomplete
          multiple
          freeSolo
          options={interestsOptions}
          value={interests}
          onChange={(event, newValue) => {
            setInterests(newValue.map(option => 
              typeof option === 'string' ? { name: option } : option
            ));
          }}
          getOptionLabel={(option) => option.name || option}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option.name || option} {...getTagProps({ index })} sx={{ bgcolor: theme.colors.secondary, color: theme.colors.textPrimary }}/>
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Interests (at least 3)"
              placeholder="Type or select interests"
              InputLabelProps={{ style: { color: theme.colors.textSecondary } }}
            />
          )}
          sx={{ mb: 2 }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          className="submit-button"
          sx={{ 
            bgcolor: theme.colors.accent, 
            color: theme.colors.textPrimary,
            '&:hover': { bgcolor: theme.colors.accentDark },
            '&.Mui-disabled': { bgcolor: theme.colors.secondary } 
          }}
        >
          {loading ? "Loading..." : 'Complete Profile'}
        </Button>
      </Paper>
    </Box>
  );
};

export default OnboardingPage;
