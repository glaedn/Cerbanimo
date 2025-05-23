import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { TextField, Autocomplete, Button, Box, Typography, Avatar, Chip } from '@mui/material';
import axios from 'axios';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';
//import TaskBrowser from '../TaskBrowser.jsx';
import './ProfilePage.css';
import { Link } from 'react-router-dom';


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
      blue[300], red[300], green[300], orange[300], purple[300], teal[300], pink[300], indigo[300],
      blue[400], red[400], green[400], orange[400], purple[400], teal[400], pink[400], indigo[400],
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
            id: profileResponse.data.id,
            username: profileResponse.data.username || '',
            skills: (profileResponse.data.skills || []).map(skill => {
              // Handle different potential formats
              if (typeof skill === 'string') {
                try {
                  if (skill.startsWith('{') && skill.includes('"name"')) {
                    return JSON.parse(skill);
                  }
                  return { name: skill };
                } catch (e) {
                  return { name: skill };
                }
              }
              return skill;
            }),
            interests: (profileResponse.data.interests || []).map(interest => {
              // Same logic as skills
              if (typeof interest === 'string') {
                try {
                  if (interest.startsWith('{') && interest.includes('"name"')) {
                    return JSON.parse(interest);
                  }
                  return { name: interest };
                } catch (e) {
                  return { name: interest };
                }
              }
              return interest;
            }),
            experience: profileResponse.data.experience || [],
            profile_picture: profileResponse.data.profile_picture || '',
          });


          // Fetch skills and interests pool
          const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setSkillsPool(optionsResponse.data.skillsPool);
          // Transform interest strings into objects with name property
          setInterestsPool(optionsResponse.data.interestsPool.map(interest => ({ name: interest })));
          console.log("API Response:", optionsResponse.data); // Debugging
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

  const [experienceDetails, setExperienceDetails] = useState([]);

  useEffect(() => {
    const fetchExperienceDetails = async () => {
      try {
        if (profileData.experience && profileData.experience.length > 0) {
          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:profile',
          });

          // Use Promise.all to fetch details for all tasks concurrently
          const taskDetailsPromises = profileData.experience.map(async (taskId) => {
            const response = await axios.get(`http://localhost:4000/tasks/${taskId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            return response.data;
          });

          const taskDetails = await Promise.all(taskDetailsPromises);
          setExperienceDetails(taskDetails);
        }
      } catch (error) {
        console.error('Error fetching experience details:', error);
      }
    };

    if (isAuthenticated && !isLoading && profileData.experience.length > 0) {
      fetchExperienceDetails();
    }
  }, [profileData.experience, isAuthenticated, isLoading]);

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
  const goToSkillTree = () => {
    navigate('/profile/skilltree'); // Ensure the `/profile` route is properly defined
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

      if (profileData.id) {
        formData.append('user_id', profileData.id);
      }

      if (profileData.profile_picture) {
        formData.append('profilePicture', profileData.profile_picture); // Use the file selected for the profile picture
      }

      const token = user?.idToken || await getAccessTokenSilently({
        audience: import.meta.env.REACT_APP_AUTH0_AUDIENCE,
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
    <Box className="profile-container">
      <Typography className="profile-title" variant="h4" gutterBottom>
        Edit Your Profile
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      
      {/* Display profile picture or preview new one */}
      <Box className="profile-card">
        <Avatar
          alt="Profile Picture"
          src={newProfilePicture || (profileData.profile_picture ? `http://localhost:4000${profileData.profile_picture}` : '/default-avatar.png')} // Default avatar if no picture
          sx={{ width: 100, height: 100, marginBottom: 2 }}
        />
      </Box>
      
      {/* File input to change the profile picture */}
      <Button variant="contained" component="label" color="primary" sx={{ marginTop: 1, marginBottom: 2 }}>
        Edit
        <input type="file" hidden onChange={handleProfilePictureChange} />
      </Button>
      
      <TextField
        label="Username"
        value={profileData.username || ''}
        onChange={(e) => handleInputChange('username', e.target.value)}
        fullWidth
        margin="normal"
      />
      <Box mb={2} >
      
      <Autocomplete
        multiple
        options={skillsPool}
        getOptionLabel={(option) => option.name || ''} // Ensure it returns a string
        value={profileData.skills || []}
        onChange={(event, newValue) => handleInputChange('skills', newValue)}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Skills" placeholder="Add skills" />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
        
            // Ensure we have a full skill object
            let fullSkill = skillsPool.find(skill => skill.name === option.name) || option;
        
            console.log('Full Skill in renderTags:', JSON.stringify(fullSkill, null, 2));
        
            let label = fullSkill.name || '';
            let skillLevel = 0;
        
            if (Array.isArray(fullSkill.unlocked_users)) {
              console.log('Unlocked Users:', JSON.stringify(fullSkill.unlocked_users, null, 2));
        
              const userEntry = fullSkill.unlocked_users.find(u => u.user_id == profileData.id);
        
              if (userEntry) {
                skillLevel = userEntry.level || 0;
              }
            }
        
            return (
              <Chip
                key={key}
                label={`${label} (Lvl ${skillLevel})`}
                {...otherProps}
                sx={{ margin: '2px' }}
              />
            );
          })
        }
        
        
        
        
        
        
        
      />
      </Box>
      <Button variant="contained" color="secondary" sx={{ marginTop: 1, marginBottom: 2 }} onClick={goToSkillTree}>
        Skill Tree
      </Button>
      <Box mb={2}>
      <Autocomplete
        multiple
        options={interestsPool}
        getOptionLabel={(option) => option.name || ''} // Ensure string return
        value={profileData.interests || []}
        onChange={(event, newValue) => handleInputChange('interests', newValue)}
        freeSolo
        renderInput={(params) => (
          <TextField {...params} variant="outlined" label="Interests" placeholder="Add interests" />
        )}
        
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={option.name} // Ensure label is a string
                {...otherProps}
                sx={{ margin: '2px' }}
              />
            );
          })
        }
      />

      </Box>
      <Box className="profile-experience-container">
      <Typography className="profile-experience-title">
        Experience:
      </Typography>
      <Box className="experience-list">
      {experienceDetails.map((task, index) => (
        <Box key={index} className="experience-item">
            <Typography variant="h6" className="task-name">
            {task.name || 'Unnamed Task'}
          </Typography>
          <Typography variant="body1" className="task-description">
            {task.description || 'No description available'}
          </Typography>
            <Link 
              to={`/visualizer/${task.project_id}`} 
              className="view-project-link"
            >
              🚀 View Project
            </Link>
        </Box>
      ))}
    </Box>
      </Box>
      
      <Box className="profile-footer">
      <Button variant="contained" color="primary" onClick={handleSaveProfile}>
        Save Profile
      </Button>
      <Button variant="contained" color="secondary" onClick={goToDashboard}>
        Dashboard
      </Button>
      <Button variant="contained" sx={{ backgroundColor: 'error.main', '&:hover': { backgroundColor: 'error.dark' } }} onClick={() => logout({ returnTo: window.location.origin })}>
        Logout
      </Button>
      </Box>
    </Box>
  );
};

export default ProfilePage;
