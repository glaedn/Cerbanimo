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

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const { data: profileData } = await axios.get(`http://localhost:4000/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Fetched profile data:', profileData);
        if (profileData) {
          setUsername(profileData.username || '');
          if (profileData.profile_picture) {
            let imagePath = profileData.profile_picture;
            // Replace backslashes with forward slashes for URL compatibility
            imagePath = imagePath.replace(/\\/g, '/');
            // Construct the full URL
            // Ensure no double slashes if profileData.profile_picture might already start with a slash
            const baseUrl = 'http://localhost:4000';
            if (imagePath.startsWith('/')) {
                setProfilePicturePreview(`${baseUrl}${imagePath}`);
            } else {
                setProfilePicturePreview(`${baseUrl}/${imagePath}`);
            }
          } else {
            setProfilePicturePreview(''); // Default to empty or a placeholder if no picture
          }
          // Ensure skills and interests are in the format [{name: 'skill1'}, {name: 'skill2'}]
          // The backend is expected to send [{id: 1, name: "React"}, ...]
          // If they are just strings, they need to be mapped.
          // The Autocomplete expects objects with a 'name' property.
          if (profileData.skills && Array.isArray(profileData.skills)) {
            const parsedSkills = profileData.skills.map(skillString => {
                try {
                    return JSON.parse(skillString); // This should result in objects like {id: 1, name: "SkillA"}
                } catch (e) {
                    console.error("Failed to parse skill string:", skillString, e);
                    return null; // Or some default/error representation
                }
            }).filter(skill => skill && skill.name); // Filter out nulls and ensure 'name' property exists
            setSkills(parsedSkills);
          } else {
            setSkills([]); // Default to empty array if no skills data
          }

          if (profileData.interests && Array.isArray(profileData.interests)) {
            const parsedInterests = profileData.interests.map(interestString => {
                try {
                    // The interest objects might just have a 'name', e.g., {"name":"Art"}
                    // Or they could have an 'id' too, e.g., {"id":123,"name":"Art"}
                    return JSON.parse(interestString); 
                } catch (e) {
                    console.error("Failed to parse interest string:", interestString, e);
                    return null;
                }
            }).filter(interest => interest && interest.name); // Filter out nulls and ensure 'name' property exists
            setInterests(parsedInterests);
          } else {
            setInterests([]); // Default to empty array if no interests data
          }
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        // Not setting a user-facing error for this, as it's pre-population
        // setError('Failed to load existing profile data.'); 
      }
    };
    fetchProfileData();
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
        navigate(`/visualizer/${response.data.project.projectId}`, { 
                state: { 
                    onboardingJustCompleted: true, 
                    updatedUserFromOnboarding: response.data.user 
                } 
            });
      } else {
        navigate('/dashboard', { 
                state: { 
                    onboardingJustCompleted: true, 
                    updatedUserFromOnboarding: response.data.user 
                } 
            });
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