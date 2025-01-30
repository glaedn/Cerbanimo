import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { TextField, Autocomplete, Button, Box, Typography, Avatar, Chip } from '@mui/material';
import axios from 'axios';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
    profile_picture: '', // This will hold the file path or URL of the profile picture
  });
  const [skillsPool, setSkillsPool] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);
  const [error, setError] = useState(null);
  const [newProfilePicture, setNewProfilePicture] = useState(null); // New state for the file input

  const colorPalette = [
    blue[100], red[100], green[100], orange[100], purple[100], teal[100], pink[100], indigo[100],
    blue[200], red[200], green[200], orange[200], purple[200], teal[200], pink[200], indigo[200],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const fetchProfileAndOptions = async () => {
        try {
          if (!user?.email) {
            throw new Error('User email is not available');
          }

          // Fetch the access token to be included in the request
          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000', // Match the exact value from Auth0
            scope: 'openid profile email read:profile write:profile',
          });
          
          if (!token) {
            throw new Error('Access token not available');
          }

          // Use the token for authorized requests
          const profileResponse = await axios.get('http://localhost:4000/profile', {
            params: { 
              sub: user.sub,
              email: user.email,
              name: user.name,
            },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          setProfileData({
            username: profileResponse.data.username || '',
            skills: profileResponse.data.skills || [],
            interests: profileResponse.data.interests || [],
            experience: profileResponse.data.experience || [],
            profile_picture: profileResponse.data.profile_picture || '', // Use the profile picture from backend
          });

          // Fetch skills and interests pool
          const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setSkillsPool(optionsResponse.data.skillsPool);
          setInterestsPool(optionsResponse.data.interestsPool);
        } catch (err) {
          console.error('Error fetching profile/options:', err);

          if (err.response && err.response.status === 401) {
            setError('Session expired. Please log in again.');
            //logout({ returnTo: window.location.origin });
          } else {
            setError('Failed to fetch profile data. Please try again later.');
          }
        }
      };

      fetchProfileAndOptions();
    }
  }, [isAuthenticated, isLoading, user, logout, getAccessTokenSilently]);

  const handleInputChange = (field, value) => {
    setProfileData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewProfilePicture(URL.createObjectURL(file)); // Create a temporary URL for the image preview
      setProfileData((prevData) => ({
        ...prevData,
        profile_picture: file, // Save the file for when the profile is saved
      }));
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard'); // Ensure the `/profile` route is properly defined
  };

  const handleSaveProfile = async () => {
    try {
      if (!user?.email) {
        throw new Error('User email is not available');
      }

      const formData = new FormData();
      formData.append('username', profileData.username);
      formData.append('skills', JSON.stringify(profileData.skills));
      formData.append('interests', JSON.stringify(profileData.interests));

      if (profileData.profile_picture) {
        formData.append('profilePicture', profileData.profile_picture); // Use the file selected for the profile picture
      }

      const token = user?.idToken || await getAccessTokenSilently({
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        scope: 'openid profile email read:profile write:profile',
      });
      console.log('JWT Token:', token);
      if (!token) {
        throw new Error('Access token not available');
      }

      await axios.post('http://localhost:4000/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to update profile.');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box 
    p={3}
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="100vh"
    >
      <Typography variant="h4" gutterBottom>
        Edit Your Profile
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      
      {/* Display profile picture or preview new one */}
      <Avatar
        alt="Profile Picture"
        src={newProfilePicture || (profileData.profile_picture ? `http://localhost:4000${profileData.profile_picture}` : '/default-avatar.png')} // Default avatar if no picture
        sx={{ width: 100, height: 100, marginBottom: 2 }}
      />
      
      {/* File input to change the profile picture */}
      <Button variant="contained" component="label" sx={{ marginBottom: 2 }}>
        Choose Profile Picture
        <input type="file" hidden onChange={handleProfilePictureChange} />
      </Button>
      
      <TextField
        label="Username"
        value={profileData.username || ''}
        onChange={(e) => handleInputChange('username', e.target.value)}
        fullWidth
        margin="normal"
      />
      <Box mb={2} width="100%">
        <Autocomplete
          multiple
          options={skillsPool}
          value={profileData.skills || []}
          onChange={(event, newValue) => handleInputChange('skills', newValue)}
          freeSolo
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Skills" placeholder="Add skills" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                key={index}
                {...getTagProps({ index })}
                style={{ backgroundColor: getRandomColorFromPalette(), margin: '2px' }}
              />
            ))
          }
        />
      </Box>
      <Box mb={2} width="100%">
        <Autocomplete
          multiple
          options={interestsPool}
          value={profileData.interests || []}
          onChange={(event, newValue) => handleInputChange('interests', newValue)}
          freeSolo
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Interests" placeholder="Add interests" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={option}
                key={index}
                {...getTagProps({ index })}
                style={{ backgroundColor: getRandomColorFromPalette(), margin: '2px' }}
              />
            ))
          }
        />
      </Box>
      <Typography variant="body1" gutterBottom>
        Experience:
      </Typography>
      <ul>
        {profileData.experience &&
          profileData.experience.map((link, index) => (
            <li key={index}>
              <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
              </a>
            </li>
          ))}
      </ul>
      <Button variant="contained" color="primary" onClick={handleSaveProfile}>
        Save Profile
      </Button>
      <Button variant="contained" color="primary" onClick={goToDashboard}>
        Back to Dashboard
      </Button>
    </Box>
  );
};

export default ProfilePage;
