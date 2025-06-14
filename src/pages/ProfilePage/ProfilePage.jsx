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
import theme from '../../styles/theme'; // Import the theme
//import TaskBrowser from '../TaskBrowser.jsx';
import './ProfilePage.css';
import { Link } from 'react-router-dom';
import ResourceListingForm from '../../components/ResourceListingForm/ResourceListingForm';
import UserPortfolio from '../UserPortfolio.jsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const ProfilePage = () => {
  const { logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  // Base style for panels
  const panelStyle = {
    backgroundColor: 'rgba(28, 28, 30, 0.85)', // theme.colors.backgroundPaper with transparency
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borders.borderRadiusLg,
    padding: '5px',
    marginBottom: theme.spacing.lg,
    boxShadow: theme.effects.glowSubtle(theme.colors.primary),
    width: '100%', 
    maxWidth: '800px', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', 
    gap: theme.spacing.md, 
  };

  const [profileData, setProfileData] = useState({
    username: '',
    skills: [],
    interests: [],
    experience: [],
    profile_picture: '', // This will hold the file path or URL of the profile picture
    contact_links: ['', '', ''], // Initialize with 3 empty strings
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
            audience: 'import.meta.env.VITE_BACKEND_URL',
            scope: 'openid profile email read:write:profile',
          });
          
          if (!token) {
            throw new Error('Access token not available');
          }

          const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
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
                  // console.log('Parsed interest:', parsed); // Debugging
                  return { name: parsed.name || parsed };
                } catch (e) {
                  // console.log('Error parsing interest:', e);
                  return { name: interest };
                }
              }
              return { name: interest.name || interest };
            }),
            experience: profileResponse.data.experience || [],
            profile_picture: profileResponse.data.profile_picture || '',
            contact_links: Array.isArray(profileResponse.data.contact_links)
              ? [...profileResponse.data.contact_links.slice(0, 3), '', '', ''].slice(0, 3)
              : ['', '', ''],
            };
          setProfileData(fetchedProfileData);


          const optionsResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const skills = optionsResponse.data?.skillsPool;
          setSkillsPool(Array.isArray(skills) ? skills : []);
          // Transform interest strings into objects with name property
          const interests = optionsResponse.data?.interestsPool;
          setInterestsPool(Array.isArray(interests) ? interests.map(interest =>
            typeof interest === 'object' ? interest : { name: interest }
          ) : []);
          // console.log("API Response:", optionsResponse.data); // Debugging
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
            audience: 'import.meta.env.VITE_BACKEND_URL',
            scope: 'openid profile email read:profile',
          });

          // Use Promise.all to fetch details for all tasks concurrently
          const taskDetailsPromises = profileData.experience.map(async (taskId) => {
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
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

  const handleContactLinkChange = (index, value) => {
    setProfileData((prevData) => {
      const newContactLinks = [...prevData.contact_links];
      newContactLinks[index] = value;
      return {
        ...prevData,
        contact_links: newContactLinks,
      };
    });
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
        audience: 'import.meta.env.VITE_BACKEND_URL/',
        scope: 'openid profile email read:profile', 
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources/user/${profileData.id}`, {
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
      // console.log('Submitting resource:', resourceData);
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}/`,
        // Ensure appropriate scope for writing resources
        scope: 'read:write:profile openid profile email read:profile',
        ignoreCache: true
      });
      let response;
      const payload = { ...resourceData };

      if (editingResource) {
        // Update existing resource
        payload.user_id = profileData.id; // Ensure user_id is set
        response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/resources/${editingResource.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Resource updated successfully!');
      } else {
        // Create new resource
        payload.owner_user_id = profileData.id; // Ensure owner_user_id is set
        // console.log('Creating new resource with payload:', payload);
        response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources`, payload, {
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
          audience: `${import.meta.env.VITE_BACKEND_URL}`,
          scope: 'write:profile, openid profile email read:profile', // Placeholder, adjust scope
        });
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/resources/${resourceId}`, {
          headers: { Authorization: `Bearer ${token}`, 
          'X-User-Id': profileData.id, // Ensure user_id is sent for authorization // 
          },
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

      // Handle contact_links
      const cleanedContactLinks = profileData.contact_links.filter(link => link.trim() !== '');
      formData.append('contact_links', JSON.stringify(cleanedContactLinks));

      if (profileData.id) {
        formData.append('user_id', profileData.id);
      }

      if (profileData.profile_picture && profileData.profile_picture instanceof File) {
        formData.append('profilePicture', profileData.profile_picture);
      } else if (profileData.profile_picture === null || profileData.profile_picture === '') {
        // Optionally, send a signal to backend to clear the picture if needed
        // formData.append('clearProfilePicture', 'true'); 
      }
      // If profileData.profile_picture is a URL string, do nothing, backend won't update it unless new file is sent

      const token = user?.idToken || await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email read:profile write:profile',
      });
      // console.log('JWT Token:', token);
      if (!token) {
        throw new Error('Access token not available');
      }

      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/profile`, formData, {
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
      <Typography 
        className="profile-title" 
        variant="h4" 
        gutterBottom
        sx={{
          color: theme.colors.primary,
          fontFamily: theme.typography.fontFamilyAccent,
          textShadow: `0 0 8px ${theme.colors.primary}7A`,
        }}
      >
        Your Profile
      </Typography>
      {error && <Typography color="error" sx={{ fontFamily: theme.typography.fontFamilyBase, color: theme.colors.error }}>{error}</Typography>}
        <Box sx={{ ...panelStyle, borderColor: theme.colors.primary, boxShadow: theme.effects.glowStrong(theme.colors.primary), paddingBottom: '20px' }}>
          <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb: 1 }}>
            User Identification
          </Typography>
          <Box 
            className="profile-card" 
            sx={{
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: theme.spacing.md, 
          backgroundColor: 'rgba(10, 10, 46, 0.5)', // Slightly different background for ID card effect
            borderRadius: theme.borders.borderRadiusMd,
            boxShadow: `inset 0 0 8px rgba(0, 243, 255, 0.3)`, // Inner shadow
            mb: 1, // Margin bottom before username field
          }}
        >
          <Avatar
            alt="Profile Picture"
            src={newProfilePicture || (profileData.profile_picture ? `${import.meta.env.VITE_BACKEND_URL}${profileData.profile_picture}` : '/default-avatar.png')}
            sx={{ 
              width: 120, 
              height: 120, 
              border: `3px solid ${theme.colors.primary}`,
              boxShadow: theme.effects.glowStrong(theme.colors.primary),
              // Attempting hexagonal clip-path. Revert if problematic.
              // clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', 
            }}
          />
          <Button 
            variant="contained" 
            component="label" 
            size="small"
            sx={{ 
              mt: 1, // Adjusted margin for internal spacing
              backgroundColor: theme.colors.primary,
              color: theme.colors.backgroundDefault,
              fontFamily: theme.typography.fontFamilyAccent,
              boxShadow: theme.effects.glowSubtle(theme.colors.primary),
              '&:hover': {
                backgroundColor: theme.colors.accentBlue,
                boxShadow: theme.effects.glowStrong(theme.colors.primary),
              }
            }}
          >
            Edit Picture
            <input type="file" hidden onChange={handleProfilePictureChange} />
          </Button>
        </Box>
        <TextField
          label="Username"
          value={profileData.username || ''}
          onChange={(e) => handleInputChange('username', e.target.value)}
          margin="none" // Margin is handled by panel's gap or specific sx here
          fullWidth // Take full width of the panel's constraint
        sx={{
          // width: '100%', // Already fullWidth
          maxWidth: '400px', // Specific max width for username field
          '& .MuiInputLabel-root': { 
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyAccent,
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: theme.colors.primary, // Label color when focused
          },
          '& .MuiOutlinedInput-root': {
            fontFamily: theme.typography.fontFamilyAccent,
            color: theme.colors.textPrimary,
            backgroundColor: 'rgba(10, 10, 46, 0.6)', // theme.colors.backgroundDefault with transparency
            '& fieldset': {
              borderColor: theme.colors.border,
              borderRadius: theme.borders.borderRadiusMd,
            },
            '&:hover fieldset': {
              borderColor: theme.colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.colors.primary,
              boxShadow: theme.effects.glowSubtle(theme.colors.primary),
            },
          },
          '& .MuiInputBase-input': {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamilyAccent,
          },
        }}
      />
      {[0, 1, 2].map((index) => (
        <TextField
          key={index}
          label={`Contact Link ${index + 1}`}
          value={profileData.contact_links[index] || ''}
          onChange={(e) => handleContactLinkChange(index, e.target.value)}
          margin="none"
          fullWidth
          sx={{
            maxWidth: '400px',
            mt: index === 0 ? 1 : 1, // Add margin top for spacing between fields
            '& .MuiInputLabel-root': { 
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyAccent,
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: theme.colors.primary,
            },
            '& .MuiOutlinedInput-root': {
              fontFamily: theme.typography.fontFamilyAccent,
              color: theme.colors.textPrimary,
              backgroundColor: 'rgba(10, 10, 46, 0.6)',
              '& fieldset': {
                borderColor: theme.colors.border,
                borderRadius: theme.borders.borderRadiusMd,
              },
              '&:hover fieldset': {
                borderColor: theme.colors.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.colors.primary,
                boxShadow: theme.effects.glowSubtle(theme.colors.primary),
              },
            },
            '& .MuiInputBase-input': {
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.fontFamilyAccent,
            },
          }}
        />
      ))}
      </Box> 

      {/* Skillset Analysis Panel */}
      <Box sx={panelStyle}>
        <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb:1 }}>
          Skillset Analysis
        </Typography>
        <Autocomplete
          multiple
          fullWidth // Takes width of panel constraint
          options={skillsPool}
          getOptionLabel={(option) => option.name || ''} 
          value={profileData.skills || []}
          onChange={(event, newValue) => handleInputChange('skills', newValue)}
          freeSolo
          renderInput={(params) => (
            <TextField 
              {...params} 
              variant="outlined" 
              label="Skills" 
              placeholder="Add skills"
              sx={{
                // Styles for TextField wrapper of Autocomplete are mostly from panelStyle or default
                '& .MuiInputLabel-root': { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyAccent,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: theme.colors.primary,
                },
                '& .MuiOutlinedInput-root': {
                  fontFamily: theme.typography.fontFamilyAccent,
                  color: theme.colors.textPrimary,
                  backgroundColor: 'rgba(10, 10, 46, 0.6)',
                  '& fieldset': {
                    borderColor: theme.colors.border,
                    borderRadius: theme.borders.borderRadiusMd,
                  },
                  '&:hover fieldset': {
                    borderColor: theme.colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.colors.primary,
                    boxShadow: theme.effects.glowSubtle(theme.colors.primary),
                  },
                },
                '& .MuiInputBase-input': {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamilyAccent,
                },
                '& .MuiAutocomplete-popupIndicator': {
                  color: theme.colors.primary,
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: theme.colors.primary,
                },
              }}
            />
          )}
          ChipProps={{
            sx: {
              backgroundColor: 'rgba(0, 243, 255, 0.15)', // Slightly more opaque primary color
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilyAccent,
              borderColor: theme.colors.primary,
              borderWidth: '1px',
              borderStyle: 'solid',
              margin: '3px', // Increased margin slightly
              boxShadow: theme.effects.glowSubtle(theme.colors.primary), // Add subtle glow to chips
              '& .MuiChip-deleteIcon': {
                color: theme.colors.secondary, // Changed to secondary for better contrast/theme alignment
                '&:hover': {
                  color: theme.colors.error, // Keep error color on hover for delete
                }
              },
            }
          }}
        slots={{
          popper: ({ disablePortal, anchorEl, ...otherPopperProps }) => (
            <Paper 
              {...otherPopperProps}
              sx={{
                backgroundColor: theme.colors.backgroundPaper,
                border: `1px solid ${theme.colors.primary}`,
                borderRadius: theme.borders.borderRadiusMd,
                boxShadow: theme.effects.glowSubtle(theme.colors.primary),
                '& .MuiAutocomplete-listbox': {
                  '& .MuiAutocomplete-option': {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.fontFamilyAccent,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 243, 255, 0.1)', 
                    },
                    '&[aria-selected="true"]': {
                      backgroundColor: 'rgba(0, 243, 255, 0.2)', 
                    },
                  },
                },
              }}
            />
          )
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
        
            // Ensure we have a full skill object
            let fullSkill = skillsPool.find(skill => skill.name === option.name) || option;
        
            // console.log('Full Skill in renderTags:', JSON.stringify(fullSkill, null, 2));
        
            let label = fullSkill.name || '';
            let skillLevel = 0;
        
            if (Array.isArray(fullSkill.unlocked_users)) {
              // console.log('Unlocked Users:', JSON.stringify(fullSkill.unlocked_users, null, 2));
        
              const userEntry = fullSkill.unlocked_users.find(u => u.user_id == profileData.id);
        
              if (userEntry) {
                skillLevel = userEntry.level || 0;
              }
            }
        
            // ChipProps above handles the primary styling
            return (
              <Chip
                key={key}
                label={`${label} (Lvl ${skillLevel})`}
                {...otherProps}
                // sx prop here would override ChipProps if needed for specific tags
              />
            );
          })
        }
        
        
        
        
        
        
        
      />
        <Button 
          variant="outlined" 
          onClick={goToSkillTree}
          sx={{ 
            borderColor: theme.colors.accentGreen,
            color: theme.colors.accentGreen,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.accentGreen),
            '&:hover': {
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              backgroundColor: 'rgba(0, 215, 135, 0.1)', 
              boxShadow: theme.effects.glowStrong(theme.colors.accentGreen),
            }
          }}
        >
          Skill Tree
        </Button>
        <Autocomplete
          multiple
          fullWidth
          options={interestsPool}
          getOptionLabel={(option) => option.name || ''} 
          value={profileData.interests || []}
          onChange={(event, newValue) => handleInputChange('interests', newValue)}
          freeSolo
          renderInput={(params) => (
            <TextField 
              {...params} 
              variant="outlined" 
              label="Interests" 
              placeholder="Add interests"
              sx={{
                '& .MuiInputLabel-root': { 
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyAccent,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: theme.colors.primary,
                },
                '& .MuiOutlinedInput-root': {
                  fontFamily: theme.typography.fontFamilyAccent,
                  color: theme.colors.textPrimary,
                  backgroundColor: 'rgba(10, 10, 46, 0.6)',
                  '& fieldset': {
                    borderColor: theme.colors.border,
                    borderRadius: theme.borders.borderRadiusMd,
                  },
                  '&:hover fieldset': {
                    borderColor: theme.colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.colors.primary,
                    boxShadow: theme.effects.glowSubtle(theme.colors.primary),
                  },
                },
                '& .MuiInputBase-input': {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamilyAccent,
                },
                '& .MuiAutocomplete-popupIndicator': {
                  color: theme.colors.primary,
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: theme.colors.primary,
                },
              }}
            />
          )}
          ChipProps={{
            sx: {
              backgroundColor: 'rgba(255, 92, 162, 0.15)', // Slightly more opaque secondary color
              color: theme.colors.secondary,
              fontFamily: theme.typography.fontFamilyAccent,
              borderColor: theme.colors.secondary,
              borderWidth: '1px',
              borderStyle: 'solid',
              margin: '3px', // Increased margin slightly
              borderRadius: theme.borders.borderRadiusSm, 
              boxShadow: theme.effects.glowSubtle(theme.colors.secondary), // Add subtle glow to chips
              '& .MuiChip-deleteIcon': {
                color: theme.colors.primary, 
                '&:hover': {
                  color: theme.colors.error, // Keep error color for delete hover
                }
              },
            }
          }}
          PopperComponent={({ disablePortal, anchorEl, ...otherPopperProps }) => (
            <Paper 
              {...otherPopperProps}
              sx={{
                backgroundColor: theme.colors.backgroundPaper,
                border: `1px solid ${theme.colors.secondary}`, 
                borderRadius: theme.borders.borderRadiusMd,
                boxShadow: theme.effects.glowSubtle(theme.colors.secondary),
                '& .MuiAutocomplete-listbox': {
                  '& .MuiAutocomplete-option': {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.typography.fontFamilyAccent,
                    borderRadius: theme.borders.borderRadiusSm,
                    margin: '2px', 
                    '&:hover': {
                      backgroundColor: 'rgba(255, 92, 162, 0.1)', 
                      boxShadow: `0 0 5px ${theme.colors.secondary}7A`,
                    },
                    '&[aria-selected="true"]': {
                      backgroundColor: 'rgba(255, 92, 162, 0.2)', 
                      '&:hover': {
                         backgroundColor: 'rgba(255, 92, 162, 0.25)',
                      }
                    },
                  },
                },
              }} 
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...otherProps } = getTagProps({ index });
              return (
                <Chip key={key} label={option.name} {...otherProps} />
              );
            })
          }
        />
      </Box>

      {/* Experience Panel */}
      <Box 
        className="profile-experience-container" 
        sx={{
          ...panelStyle,
          borderColor: theme.colors.primary, 
          // boxShadow is from panelStyle, padding from panelStyle
          // backgroundColor is from panelStyle
          // borderRadius is from panelStyle
        }}
      >
        <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb:1 }}>
          Mission Log
        </Typography>
        <UserPortfolio userId={profileData.id}/>
      </Box>
      
      {/* Resources Panel */}
      <Box 
        className="profile-resources-container" 
        sx={{ 
          ...panelStyle,
          borderColor: theme.colors.secondary, // Example: make this panel use secondary color for border/glow
          boxShadow: theme.effects.glowSubtle(theme.colors.secondary),
        }}
      >
        <Typography 
          variant="h6" // Changed to h6 for consistency
          gutterBottom 
          sx={{
            color: theme.colors.primary, 
            fontFamily: theme.typography.fontFamilyAccent,
            width: '100%', 
            textAlign: 'center',
            // mb: 2, // Handled by panel gap or specific title margin
          }}
        >
          Resource Inventory
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => handleOpenResourceModal()} 
          sx={{ 
            backgroundColor: theme.colors.accentGreen,
            color: theme.colors.backgroundDefault,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.accentGreen),
            borderRadius: theme.borders.borderRadiusMd,
            '&:hover': {
              backgroundColor: '#00b870', 
              boxShadow: theme.effects.glowStrong(theme.colors.accentGreen),
            }
          }}
        >
          List New Resource
        </Button>
        {resourcesLoading && <CircularProgress sx={{ color: theme.colors.primary, display: 'block', margin: 'auto' }} />}
        {resourceError && <Typography color="error" sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.error}}>{resourceError}</Typography>}
        {!resourcesLoading && !resourceError && userResources.length === 0 && (
          <Typography sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.textSecondary}}>You haven't listed any resources yet.</Typography>
        )}
        {!resourcesLoading && !resourceError && userResources.length > 0 && (
          <List sx={{width: '100%'}}>
            {userResources.map((resource) => (
              <ListItem 
                key={resource.id}
                secondaryAction={
                  <>
                    <IconButton 
                      edge="end" 
                      aria-label="edit" 
                      onClick={() => handleOpenResourceModal(resource)} 
                      sx={{
                        mr: 1, 
                        color: theme.colors.accentBlue,
                        '&:hover': { color: theme.colors.primary }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleDeleteResource(resource.id)}
                      sx={{
                        color: theme.colors.accentOrange,
                        '&:hover': { color: theme.colors.error }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
                sx={{ 
                  borderBottom: `1px solid ${theme.colors.border}`,
                  mb: 1,
                  backgroundColor: 'rgba(28, 28, 30, 0.5)', 
                  borderRadius: theme.borders.borderRadiusSm,
                  '&:hover': {
                    backgroundColor: 'rgba(28, 28, 30, 0.8)',
                    boxShadow: `0 0 5px ${theme.colors.secondary}`,
                  }
                }}
              >
                <ListItemText 
                  primary={resource.name} 
                  secondary={
                    <>
                      <Typography component="span" variant="body2" sx={{ color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyBase }}>
                        Category: {resource.category || 'N/A'}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" sx={{ color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyBase }}>
                        Quantity: {resource.quantity || 'N/A'} - Status: {resource.status || 'N/A'}
                      </Typography>
                    </>
                  } 
                  primaryTypographyProps={{
                    sx: {
                      color: theme.colors.primary,
                      fontFamily: theme.typography.fontFamilyAccent,
                      fontSize: theme.typography.fontSizeLg, 
                    }
                  }}
                  secondaryTypographyProps={{ 
                     sx: { fontFamily: theme.typography.fontFamilyBase }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Command Module Panel */}
      <Box sx={{ ...panelStyle, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb:1 }}>
          Command Module
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleSaveProfile}
          sx={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.backgroundDefault,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.primary),
            borderRadius: theme.borders.borderRadiusMd,
            '&:hover': {
              backgroundColor: theme.colors.accentBlue,
              boxShadow: theme.effects.glowStrong(theme.colors.primary),
            }
          }}
        >
          Save Profile
        </Button>
        <Button 
          variant="outlined" 
          onClick={goToDashboard}
          sx={{
            borderColor: theme.colors.secondary,
            color: theme.colors.secondary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.secondary),
            borderRadius: theme.borders.borderRadiusMd,
            '&:hover': {
              borderColor: theme.colors.accentPink, 
              color: theme.colors.accentPink,
              backgroundColor: 'rgba(255, 92, 162, 0.1)',
              boxShadow: theme.effects.glowStrong(theme.colors.secondary),
            }
          }}
        >
          Dashboard
        </Button>
        <Button 
          variant="contained" 
          onClick={() => logout({ returnTo: window.location.origin })}
          sx={{ 
            backgroundColor: theme.colors.error, 
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.error),
            borderRadius: theme.borders.borderRadiusMd,
            '&:hover': { 
              backgroundColor: theme.colors.accentOrange, 
              boxShadow: theme.effects.glowStrong(theme.colors.error),
            } 
          }}
        >
          Logout
        </Button>
      </Box>

      {/* Resource Form Modal (remains outside the panel structure) */}
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
          bgcolor: theme.colors.backgroundPaper, // Theme background for modal
          boxShadow: theme.effects.glowStrong(theme.colors.primary),
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: theme.borders.borderRadiusLg,
          border: `1px solid ${theme.colors.primary}`,
          color: theme.colors.textPrimary, // Default text color for modal content
        }}>
          <Typography 
            variant="h6" 
            component="h2" // Modal title SEO tag
            sx={{ 
              color: theme.colors.primary, 
              fontFamily: theme.typography.fontFamilyAccent,
              textAlign: 'center',
              mb: theme.spacing.md, // Margin bottom for title
              textShadow: `0 0 5px ${theme.colors.primary}7A`,
            }}
          >
            {editingResource ? 'Update Resource Details' : 'List New Resource'}
          </Typography>
          <ResourceListingForm 
            initialResourceData={editingResource}
            onSubmit={handleResourceSubmit}
            onCancel={handleCloseResourceModal}
            theme={theme} // Pass theme to ResourceListingForm
          />
        </Paper>
      </Modal>
    </Box>
  );
};

export default ProfilePage;
