import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { TextField, Autocomplete, Button, Box, Typography } from '@mui/material';
import axios from 'axios';

const ProfilePage = () => {
  const { logout, user, isAuthenticated, isLoading, getTokenSilently } = useAuth0();
  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
  });
  const [skillsPool, setSkillsPool] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const fetchProfileAndOptions = async () => {
        try {
          if (!user?.email) {
            throw new Error('User email is not available');
          }

          // Fetch the access token to be included in the request
          const token = await getTokenSilently();
          if (!token) {
            throw new Error('Access token not available');
          }

          // Use the token for authorized requests
          const profileResponse = await axios.get('http://localhost:4000/profile', {
            params: { email: user.email },
            headers: {
              Authorization: `Bearer ${token}`, // Send token in the header
            },
          });

          setProfileData({
            username: profileResponse.data.username || '',
            skills: profileResponse.data.skills || [],
            interests: profileResponse.data.interests || [],
            experience: profileResponse.data.experience || [],
          });

          // Fetch skills and interests pool
          const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
            headers: {
              Authorization: `Bearer ${token}`, // Send token in the header
            },
          });
          setSkillsPool(optionsResponse.data.skillsPool);
          setInterestsPool(optionsResponse.data.interestsPool);
        } catch (err) {
          console.error('Error fetching profile/options:', err);

          if (err.response && err.response.status === 401) {
            setError('Session expired. Please log in again.');
            logout({ returnTo: window.location.origin }); // Redirect to login
          } else {
            setError('Failed to fetch profile data. Please try again later.');
          }
        }
      };

      fetchProfileAndOptions();
    }
  }, [isAuthenticated, isLoading, user, logout, getTokenSilently]);

  const handleInputChange = (field, value) => {
    setProfileData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
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

      if (profileData.profilePicture) {
        formData.append('profilePicture', profileData.profilePicture);
      }

      // Fetch the access token to be included in the request
      const token = await getTokenSilently();
      if (!token) {
        throw new Error('Access token not available');
      }

      // Send the user's email as part of the request
      await axios.post('http://localhost:4000/profile', formData, {
        params: { email: user.email }, // Send email to the backend for identification
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`, // Include the token here as well
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
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Edit Your Profile
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      <TextField
        label="Username"
        value={profileData.username || ''}
        onChange={(e) => handleInputChange('username', e.target.value)}
        fullWidth
        margin="normal"
      />
      <Autocomplete
        multiple
        options={skillsPool}
        value={profileData.skills || []}
        onChange={(event, newValue) => handleInputChange('skills', newValue)}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Skills" placeholder="Add skills" />
        )}
      />
      <Autocomplete
        multiple
        options={interestsPool}
        value={profileData.interests || []}
        onChange={(event, newValue) => handleInputChange('interests', newValue)}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Interests" placeholder="Add interests" />
        )}
      />
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
    </Box>
  );
};

export default ProfilePage;
