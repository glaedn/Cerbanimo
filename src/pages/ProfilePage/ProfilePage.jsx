import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  TextField, Autocomplete, Button, Box, Typography, Avatar, Chip,
  Modal, Paper, List, ListItem, ListItemText, IconButton, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { useNavigate } from 'react-router-dom';
//import TaskBrowser from '../TaskBrowser.jsx';
import './ProfilePage.css';
import { Link } from 'react-router-dom';
import ResourceListingForm from '../../components/ResourceListingForm/ResourceListingForm';
import UserPortfolio from '../UserPortfolio.jsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

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

  // State for Resources
  const [userResources, setUserResources] = useState([]);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceError, setResourceError] = useState(null);

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

          const token = await getAccessTokenSilently({
            audience: 'http://localhost:4000',
            scope: 'openid profile email read:write:profile',
          });
          
          if (!token) {
            throw new Error('Access token not available');
          }

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

            const fetchedProfileData = {
            id: profileResponse.data.id,
            username: profileResponse.data.username || '',
            skills: (profileResponse.data.skills || []).map(skill => {
              if (typeof skill === 'string') {
              try {
                return JSON.parse(skill);
              } catch (e) {
                return { name: skill };
              }
              }
              return skill;
            }),
            interests: (profileResponse.data.interests || []).map(interest => {
              if (typeof interest === 'string') {
                try {
                  const parsed = JSON.parse(interest);
                  console.log('Parsed interest:', parsed); // Debugging
                  return { name: parsed.name || parsed };
                } catch (e) {
                  console.log('Error parsing interest:', e);
                  return { name: interest };
                }
              }
              return { name: interest.name || interest };
            }),
            experience: profileResponse.data.experience || [],
            profile_picture: profileResponse.data.profile_picture || '',
            };
          setProfileData(fetchedProfileData);


          const optionsResponse = await axios.get('http://localhost:4000/profile/options', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setSkillsPool(optionsResponse.data.skillsPool);
          // Transform interest strings into objects with name property
          setInterestsPool(optionsResponse.data.interestsPool.map(interest => 
            typeof interest === 'object' ? interest : { name: interest }
          ));
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
  }, [isAuthenticated, isLoading, user, logout, getAccessTokenSilently]); // Removed profileData.id from deps

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
    navigate('/profile/skilltree');
  };

  // --- Resource Management Functions ---
  const fetchUserResources = useCallback(async () => {
    if (!profileData.id) return;
    setResourcesLoading(true);
    setResourceError(null);
    try {
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:4000/',
        scope: 'openid profile email read:profile', 
      });
      const response = await axios.get(`http://localhost:4000/resources/user/${profileData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserResources(response.data);
    } catch (err) {
      console.error('Error fetching user resources:', err);
      setResourceError('Failed to fetch resources.');
      // alert('Failed to fetch your resources.');
    } finally {
      setResourcesLoading(false);
    }
  }, [profileData.id, getAccessTokenSilently]);

  useEffect(() => {
    if (profileData.id) {
      fetchUserResources();
    }
  }, [profileData.id, fetchUserResources]);

  const handleOpenResourceModal = (resource = null) => {
    setEditingResource(resource);
    setIsResourceModalOpen(true);
  };

  const handleCloseResourceModal = () => {
    setIsResourceModalOpen(false);
    setEditingResource(null);
  };

  const handleResourceSubmit = async (resourceData) => {
    try {
      console.log('Submitting resource:', resourceData);
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:4000/',
        // Ensure appropriate scope for writing resources
        scope: 'read:write:profile openid profile email read:profile',
        ignoreCache: true
      });
      let response;
      const payload = { ...resourceData };

      if (editingResource) {
        // Update existing resource
        payload.user_id = profileData.id; // Ensure user_id is set
        response = await axios.put(`http://localhost:4000/resources/${editingResource.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Resource updated successfully!');
      } else {
        // Create new resource
        payload.owner_user_id = profileData.id; // Ensure owner_user_id is set
        console.log('Creating new resource with payload:', payload);
        response = await axios.post('http://localhost:4000/resources', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Resource created successfully!');
      }
      
      fetchUserResources(); // Refresh list
      handleCloseResourceModal();
    } catch (err) {
      console.error('Error submitting resource:', err.response ? err.response.data : err.message);
      alert(`Failed to save resource: ${err.response ? err.response.data.error : err.message}`);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        const token = await getAccessTokenSilently({
          audience: 'http://localhost:4000',
          scope: 'write:profile, openid profile email read:profile', // Placeholder, adjust scope
        });
        await axios.delete(`http://localhost:4000/resources/${resourceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Resource deleted successfully!');
        fetchUserResources(); // Refresh list
      } catch (err) {
        console.error('Error deleting resource:', err);
        alert('Failed to delete resource.');
      }
    }
  };
  // --- End Resource Management Functions ---


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
        <UserPortfolio userId={profileData.id}/>
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

      {/* My Resources Section */}
      <Box className="profile-resources-container" sx={{ mt: 4, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          My Resources
        </Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenResourceModal()} sx={{ mb: 2 }}>
          List New Resource
        </Button>
        {resourcesLoading && <CircularProgress />}
        {resourceError && <Typography color="error">{resourceError}</Typography>}
        {!resourcesLoading && !resourceError && userResources.length === 0 && (
          <Typography>You haven't listed any resources yet.</Typography>
        )}
        {!resourcesLoading && !resourceError && userResources.length > 0 && (
          <List>
            {userResources.map((resource) => (
              <ListItem 
                key={resource.id}
                secondaryAction={
                  <>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleOpenResourceModal(resource)} sx={{mr: 1}}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteResource(resource.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
                sx={{ borderBottom: '1px solid #eee' }}
              >
                <ListItemText 
                  primary={resource.name} 
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        Category: {resource.category || 'N/A'}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.secondary">
                        Quantity: {resource.quantity || 'N/A'} - Status: {resource.status || 'N/A'}
                      </Typography>
                    </>
                  } 
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Resource Form Modal */}
      <Modal
        open={isResourceModalOpen}
        onClose={handleCloseResourceModal}
        aria-labelledby="resource-modal-title"
        aria-describedby="resource-modal-description"
      >
        <Paper sx={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '75%', md: '600px' },
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
        }}>
          <ResourceListingForm
            initialResourceData={editingResource}
            onSubmit={handleResourceSubmit}
            onCancel={handleCloseResourceModal}
          />
        </Paper>
      </Modal>
    </Box>
  );
};

export default ProfilePage;
