import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, Autocomplete, Avatar, CircularProgress } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import Dropzone from 'react-dropzone';
import axios from 'axios';
import './ProfilePage.css';

const ProfilePage = () => {
  const { getAccessTokenSilently } = useAuth0();

  const [skillsPool, setSkillsPool] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);

  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
    profilePicture: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  useEffect(() => {
    const fetchProfileAndOptions = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
  
        // Fetch profile data
        const profileResponse = await axios.get('http://localhost:4000/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfileData(profileResponse.data);
  
        // Fetch skills and interests pool
        const optionsResponse = await axios.get('http://localhost:4000/profile/options');
        setSkillsPool(optionsResponse.data.skillsPool);
        setInterestsPool(optionsResponse.data.interestsPool);
      } catch (err) {
        console.error('Error fetching profile/options:', err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProfileAndOptions();
  }, [getAccessTokenSilently]);
  

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (acceptedFiles) => {
    setProfileData((prev) => ({ ...prev, profilePicture: acceptedFiles[0] }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = await getAccessTokenSilently();

      const formData = new FormData();
      formData.append('username', profileData.username);
      formData.append('skills', JSON.stringify(profileData.skills));
      formData.append('interests', JSON.stringify(profileData.interests));
      formData.append('experience', JSON.stringify(profileData.experience));
      if (profileData.profilePicture) {
        formData.append('profilePicture', profileData.profilePicture);
      }

      await axios.post('http://localhost:4000/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box className="profile-page" p={3}>
      <Typography variant="h4" gutterBottom>
        Edit Your Profile
      </Typography>
      <Avatar
        src={
          profileData.profilePicture
            ? URL.createObjectURL(profileData.profilePicture)
            : profileData.profile_picture || 'default-avatar.png'
        }
        alt="Profile Picture"
        sx={{ width: 100, height: 100, mb: 2 }}
      />
      <Dropzone onDrop={handleFileUpload} multiple={false}>
        {({ getRootProps, getInputProps }) => (
          <Box {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            <Typography variant="body1">
              Drag & drop your profile picture here, or click to select a file
            </Typography>
          </Box>
        )}
      </Dropzone>

      const [isEditingUsername, setIsEditingUsername] = useState(false);

      <TextField
        label="Username"
        value={profileData.username}
        onChange={(e) => handleInputChange('username', e.target.value)}
        disabled={!isEditingUsername}
        fullWidth
        margin="normal"
      />
      <Button
        variant="contained"
        color="secondary"
        onClick={() => setIsEditingUsername(!isEditingUsername)}
      >
        {isEditingUsername ? 'Save' : 'Edit'}
      </Button>

      <Autocomplete
        multiple
        options={['React', 'Node.js', 'Python']}
        value={profileData.skills}
        onChange={(e, newValue) => handleInputChange('skills', newValue)}
        renderInput={(params) => <TextField {...params} label="Skills" />}
        margin="normal"
      />
      <Autocomplete
        multiple
        options={['Web Development', 'Data Science']}
        value={profileData.interests}
        onChange={(e, newValue) => handleInputChange('interests', newValue)}
        renderInput={(params) => <TextField {...params} label="Interests" />}
        margin="normal"
      />
      <Typography variant="body1" gutterBottom>
      Experience:
      </Typography>
      <ul>
        {profileData.experience.map((link, index) => (
          <li key={index}>
            <a href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </a>
          </li>
        ))}
      </ul>

<Button variant="contained" color="primary" onClick={handleSaveProfile} disabled={saving}>
  {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </Box>
  );
};

export default ProfilePage;
