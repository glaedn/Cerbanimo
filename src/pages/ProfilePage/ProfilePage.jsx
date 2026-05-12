import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  TextField, Autocomplete, Button, Box, Typography, Avatar, Chip,
  Modal, Paper, List, ListItem, ListItemText, IconButton, CircularProgress, LinearProgress,
  createFilterOptions, MenuItem, Select, FormControl, InputLabel, FormControlLabel, Checkbox
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../../styles/theme'; // Import the theme
import { useIsMobile } from '../../hooks/useIsMobile';
import { useUserProfile } from '../../hooks/useUserProfile';
import ChronicleTimeline from '../../components/ChronicleTimeline';
//import TaskBrowser from '../TaskBrowser.jsx';
import './ProfilePage.css';
import { Link } from 'react-router-dom';
import ShareIcon from '@mui/icons-material/Share';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { toast } from 'react-hot-toast';
import ResourceListingForm from '../../components/ResourceListingForm/ResourceListingForm';
import NeedDeclarationForm from '../../components/NeedDeclarationForm/NeedDeclarationForm.jsx';
import UserPortfolio from '../UserPortfolio.jsx';
import UserSearch from '../../components/UserSearch.jsx';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const ProfilePage = () => {
  const { logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { profile: dynamicProfile, loading: profileLoading } = useUserProfile();
  const [userChronicle, setUserChronicle] = useState([]);

  // Base style for panels
  const panelStyle = {
    backgroundColor: 'rgba(28, 28, 30, 0.85)', // theme.colors.backgroundPaper with transparency
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borders.borderRadiusLg,
    padding: isMobile ? '16px' : '24px',
    marginBottom: theme.spacing.lg,
    boxShadow: theme.effects.glowSubtle(theme.colors.primary),
    width: '100%', 
    maxWidth: isMobile ? '100%' : '800px',
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
    contact_links: ['', ''], // Initialize with 2 empty strings
    capacity_status: 'active',
    discord_user_id: '',
    latitude: '',
    longitude: '',
    share_location_publicly: false,
    city: '',
    state: '',
    country: '',
  });
  const [skillsPool, setSkillsPool] = useState([]);
  const [interestsPool, setInterestsPool] = useState([]);
  const [error, setError] = useState(null);
  const [newProfilePicture, setNewProfilePicture] = useState(null); // New state for the file input

  // State for Resources
  const [userResources, setUserResources] = useState([]);
  const [userNeeds, setUserNeeds] = useState([]);
  const [needsLoading, setNeedsLoading] = useState(false);
  const [userCommunities, setUserCommunities] = useState([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceError, setResourceError] = useState(null);

  // State for Services
  const [services, setServices] = useState([]);

  // State for Badges
  const [userBadges, setUserBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgesError, setBadgesError] = useState(null);

  // Geocoding State
  const [locationSearch, setLocationSearch] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

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

          const capacityStatus = profileResponse.data.capacity_status || 'active';

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
              ? [...profileResponse.data.contact_links.slice(0, 2), '', '', ''].slice(0, 2)
              : ['', ''],
            capacity_status: capacityStatus,
            discord_user_id: profileResponse.data.discord_user_id || '',
            latitude: profileResponse.data.location?.coordinates[1] || '',
            longitude: profileResponse.data.location?.coordinates[0] || '',
            share_location_publicly: profileResponse.data.share_location_publicly || false,
            city: profileResponse.data.city || '',
            state: profileResponse.data.state || '',
            country: profileResponse.data.country || '',
            };

          // Auto-populate Discord ID if provided in query params
          const queryParams = new URLSearchParams(location.search);
          const discordIdFromUrl = queryParams.get('discord_id');
          if (discordIdFromUrl) {
            fetchedProfileData.discord_user_id = discordIdFromUrl;
          }

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

  const [portfolioToken, setPortfolioToken] = useState(null);
  // Fetch portfolio token for UserPortfolio
  useEffect(() => {
    let isMounted = true;
    const fetchPortfolioToken = async () => {
      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_BACKEND_URL,
          scope: "openid profile email read:profile write:profile"
        });
        if (isMounted) setPortfolioToken(token);
      } catch {
        if (isMounted) setPortfolioToken(null);
      }
    };
    fetchPortfolioToken();
    return () => { isMounted = false; };
  }, [getAccessTokenSilently]);

  const handleInputChange = (field, value) => {
    setProfileData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (locationSearch && locationSearch.length > 2) {
        setIsGeocoding(true);
        try {
          const token = await getAccessTokenSilently();
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/spatial-ops/search-location?q=${locationSearch}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setLocationOptions(response.data);
        } catch (err) {
          console.error('Failed to search location:', err);
        } finally {
          setIsGeocoding(false);
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationSearch, getAccessTokenSilently]);

  const handleLocationSelect = (event, newValue) => {
    if (newValue) {
      setProfileData(prev => ({
        ...prev,
        city: newValue.address.city || '',
        state: newValue.address.state || '',
        country: newValue.address.country || '',
        latitude: newValue.latitude,
        longitude: newValue.longitude
      }));
    }
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

  const handleShareProfile = () => {
    const publicProfileUrl = `${window.location.origin}/profile/public/${profileData.id}`;
    navigator.clipboard.writeText(publicProfileUrl).then(() => {
      toast.success('Public profile link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy profile link:', err);
      toast.error('Failed to copy profile link');
    });
  };
  const goToSkillConstellation = () => {
    navigate(`/profile/skill-constellation/${profileData.id}`);
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
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources/inventory/${profileData.id}`, {
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
      fetchUserNeeds();
      fetchUserServices();
    }
  }, [profileData.id, fetchUserResources]);

  const fetchUserNeeds = useCallback(async () => {
    if (!profileData.id) return;
    setNeedsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/needs/user/${profileData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserNeeds(response.data);
    } catch (err) {
      console.error('Error fetching user needs:', err);
    } finally {
      setNeedsLoading(false);
    }
  }, [profileData.id, getAccessTokenSilently]);

  const handleNeedSubmit = async (needData) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/needs`, {
        ...needData,
        requestor_user_id: profileData.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Need declared successfully!');
      setIsNeedModalOpen(false);
      fetchUserNeeds();
    } catch (err) {
      console.error('Error declaring need:', err);
      toast.error('Failed to declare need.');
    }
  };

  const fetchUserServices = async () => {
    if (!profileData.id) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/services/user/${profileData.id}`);
      setServices(response.data || []);
    } catch (err) {
      console.error('Error fetching user services:', err);
    }
  };

  // --- Badge Management Functions ---
  const fetchUserBadges = useCallback(async () => {
    if (!profileData.id) return;
    setBadgesLoading(true);
    setBadgesError(null);
    try {
      const token = await getAccessTokenSilently({
        audience: `${import.meta.env.VITE_BACKEND_URL}/`, // Make sure audience is just the backend URL
        scope: 'openid profile email read:profile', // Adjust scope as needed for badges
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/rewards/user/${profileData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserBadges(response.data.badges || []);
    } catch (err) {
      console.error('Error fetching user badges:', err);
      setBadgesError('Failed to fetch badges.');
    } finally {
      setBadgesLoading(false);
    }
  }, [profileData.id, getAccessTokenSilently]);

  useEffect(() => {
    if (profileData.id) {
      fetchUserBadges();
    }
  }, [profileData.id, fetchUserBadges]);
  // --- End Badge Management Functions ---

  // --- Community Management Functions ---
  const fetchUserCommunities = useCallback(async () => {
    if (!profileData.id) return;
    setCommunitiesLoading(true);
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_BACKEND_URL,
        scope: 'openid profile email read:profile',
      });
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/user/${profileData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserCommunities(response.data || []);
    } catch (err) {
      console.error('Error fetching user communities:', err);
    } finally {
      setCommunitiesLoading(false);
    }
  }, [profileData.id, getAccessTokenSilently]);

  useEffect(() => {
    if (profileData.id) {
      fetchUserCommunities();
    }
  }, [profileData.id, fetchUserCommunities]);
  // --- End Community Management Functions ---

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
        response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/resources/inventory/${editingResource.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert('Resource updated successfully!');
      } else {
        // Create new resource
        payload.ownerUserId = profileData.id; // Correct parameter name for v2
        // console.log('Creating new resource with payload:', payload);
        response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/resources/add`, payload, {
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
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/resources/inventory/${resourceId}`, {
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
      formData.append('capacity_status', profileData.capacity_status);
      formData.append('discord_user_id', profileData.discord_user_id);
      formData.append('latitude', profileData.latitude);
      formData.append('longitude', profileData.longitude);
      formData.append('share_location_publicly', profileData.share_location_publicly);
      formData.append('city', profileData.city);
      formData.append('state', profileData.state);
      formData.append('country', profileData.country);

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

      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });


      if (response.data.profile) {
        const updatedProfile = response.data.profile;
        setProfileData(prev => ({
          ...prev,
          username: updatedProfile.username || prev.username,
          skills: (updatedProfile.skills || []).map(skill => typeof skill === 'string' ? JSON.parse(skill) : skill),
          interests: (updatedProfile.interests || []).map(interest => typeof interest === 'string' ? JSON.parse(interest) : interest),
          profile_picture: updatedProfile.profile_picture || prev.profile_picture,
          contact_links: Array.isArray(updatedProfile.contact_links)
            ? [...updatedProfile.contact_links.slice(0, 2), '', ''].slice(0, 2)
            : ['', ''],
          discord_user_id: updatedProfile.discord_user_id || prev.discord_user_id,
          latitude: updatedProfile.location?.coordinates[1] || prev.latitude,
          longitude: updatedProfile.location?.coordinates[0] || prev.longitude,
          share_location_publicly: updatedProfile.share_location_publicly || false,
          city: updatedProfile.city || prev.city,
          state: updatedProfile.state || prev.state,
          country: updatedProfile.country || prev.country,
        }));
      }

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
    <Box className={`profile-container ${isMobile ? 'mobile-container' : ''}`} sx={{ pb: isMobile ? 12 : 2 }}>
      <Typography 
        className="profile-title" 
        variant={isMobile ? "h5" : "h4"}
        gutterBottom
        sx={{
          color: theme.colors.primary,
          fontFamily: theme.typography.fontFamilyAccent,
          textShadow: `0 0 8px ${theme.colors.primary}7A`,
          textAlign: isMobile ? 'center' : 'left',
          mt: isMobile ? 2 : 0
        }}
      >
        Your Profile
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', mb: 2 }}>
        <UserSearch />
      </Box>
      {error && <Typography color="error" sx={{ fontFamily: theme.typography.fontFamilyBase, color: theme.colors.error }}>{error}</Typography>}
        <Box sx={{
          ...panelStyle,
          borderColor: theme.colors.primary,
          boxShadow: theme.effects.glowStrong(theme.colors.primary),
          paddingBottom: '20px',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb: 1 }}>
            User Identification
          </Typography>
          <Box 
            className="profile-card" 
            sx={{
          display: 'flex', 
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center', 
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: theme.spacing.md, 
          width: '100%',
          backgroundColor: 'rgba(10, 10, 46, 0.5)',
            borderRadius: theme.borders.borderRadiusMd,
            boxShadow: `inset 0 0 8px rgba(0, 243, 255, 0.3)`,
            mb: 1,
            gap: 2
          }}
        >
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar
                alt="Profile Picture"
                src={newProfilePicture || profileData.profile_picture || (user && user.picture ? user.picture : '/default-avatar.png')}
                sx={{
                width: isMobile ? 80 : 120,
                height: isMobile ? 80 : 120,
                border: `3px solid ${theme.colors.primary}`,
                boxShadow: theme.effects.glowStrong(theme.colors.primary),
                }}
            />
            <Button
                variant="contained"
                component="label"
                size="small"
                sx={{
                mt: 1,
                backgroundColor: theme.colors.primary,
                color: theme.colors.backgroundDefault,
                fontFamily: theme.typography.fontFamilyAccent,
                fontSize: isMobile ? '0.6rem' : '0.8rem',
                boxShadow: theme.effects.glowSubtle(theme.colors.primary),
                '&:hover': {
                    backgroundColor: theme.colors.accentBlue,
                    boxShadow: theme.effects.glowStrong(theme.colors.primary),
                }
                }}
            >
                Edit
                <input type="file" hidden onChange={handleProfilePictureChange} />
            </Button>
          </Box>
          {isMobile && (
            <Box flexGrow={1}>
                <Typography variant="h6" sx={{ color: '#00f3ff', fontFamily: 'Orbitron' }}>{profileData.username}</Typography>
                <Box mt={1}>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                        LEVEL {dynamicProfile?.experience?.current_level || 1} ARCHITECT
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={((dynamicProfile?.experience?.total_xp || 0) / (dynamicProfile?.experience?.xp_for_next_level || 100)) * 100}
                        sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#00f3ff' } }}
                    />
                </Box>
            </Box>
          )}
        </Box>
        <TextField
          label="Username"
          value={profileData.username || ''}
          onChange={(e) => handleInputChange('username', e.target.value)}
          margin="none"
          fullWidth
        sx={{
          maxWidth: '400px',
          mb: 2,
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
      <Autocomplete
        fullWidth
        sx={{ maxWidth: '400px', mb: 2 }}
        options={locationOptions}
        getOptionLabel={(option) => option.displayName || ''}
        loading={isGeocoding}
        onInputChange={(event, newInputValue) => setLocationSearch(newInputValue)}
        onChange={handleLocationSelect}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Location (City, Address...)"
            placeholder="Start typing..."
            sx={{
              '& .MuiInputLabel-root': { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyAccent },
              '& .MuiOutlinedInput-root': {
                color: theme.colors.textPrimary,
                backgroundColor: 'rgba(10, 10, 46, 0.6)',
                '& fieldset': { borderColor: theme.colors.border },
                '&:hover fieldset': { borderColor: theme.colors.primary },
              }
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <LocationOnIcon sx={{ color: theme.colors.primary, mr: 1 }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {isGeocoding ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <FormControl fullWidth sx={{ maxWidth: '400px', mb: 2 }}>
        <InputLabel sx={{ color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyAccent }}>Capacity Status</InputLabel>
        <Select
          value={profileData.capacity_status || 'active'}
          label="Capacity Status"
          onChange={(e) => handleInputChange('capacity_status', e.target.value)}
          sx={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamilyAccent,
            backgroundColor: 'rgba(10, 10, 46, 0.6)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.colors.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.colors.primary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.colors.primary,
            },
            '& .MuiSvgIcon-root': {
              color: theme.colors.primary,
            }
          }}
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="limited">Limited</MenuItem>
          <MenuItem value="unavailable">Unavailable</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: '100%', maxWidth: '400px', mb: 2 }}>
        <TextField
          label="City"
          value={profileData.city || ''}
          onChange={(e) => handleInputChange('city', e.target.value)}
          margin="none"
          fullWidth
          sx={{
            flex: '1 1 100%',
            '& .MuiInputLabel-root': { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyAccent },
            '& .MuiInputLabel-root.Mui-focused': { color: theme.colors.primary },
            '& .MuiOutlinedInput-root': {
              fontFamily: theme.typography.fontFamilyAccent,
              color: theme.colors.textPrimary,
              backgroundColor: 'rgba(10, 10, 46, 0.6)',
              '& fieldset': { borderColor: theme.colors.border, borderRadius: theme.borders.borderRadiusMd },
              '&:hover fieldset': { borderColor: theme.colors.primary },
              '&.Mui-focused fieldset': { borderColor: theme.colors.primary, boxShadow: theme.effects.glowSubtle(theme.colors.primary) },
            },
            '& .MuiInputBase-input': { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyAccent },
          }}
        />
        <TextField
          label="State / Region"
          value={profileData.state || ''}
          onChange={(e) => handleInputChange('state', e.target.value)}
          margin="none"
          fullWidth
          sx={{
            flex: '1 1 48%',
            '& .MuiInputLabel-root': { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyAccent },
            '& .MuiInputLabel-root.Mui-focused': { color: theme.colors.primary },
            '& .MuiOutlinedInput-root': {
              fontFamily: theme.typography.fontFamilyAccent,
              color: theme.colors.textPrimary,
              backgroundColor: 'rgba(10, 10, 46, 0.6)',
              '& fieldset': { borderColor: theme.colors.border, borderRadius: theme.borders.borderRadiusMd },
              '&:hover fieldset': { borderColor: theme.colors.primary },
              '&.Mui-focused fieldset': { borderColor: theme.colors.primary, boxShadow: theme.effects.glowSubtle(theme.colors.primary) },
            },
            '& .MuiInputBase-input': { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyAccent },
          }}
        />
        <TextField
          label="Country"
          value={profileData.country || ''}
          onChange={(e) => handleInputChange('country', e.target.value)}
          margin="none"
          fullWidth
          sx={{
            flex: '1 1 48%',
            '& .MuiInputLabel-root': { color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyAccent },
            '& .MuiInputLabel-root.Mui-focused': { color: theme.colors.primary },
            '& .MuiOutlinedInput-root': {
              fontFamily: theme.typography.fontFamilyAccent,
              color: theme.colors.textPrimary,
              backgroundColor: 'rgba(10, 10, 46, 0.6)',
              '& fieldset': { borderColor: theme.colors.border, borderRadius: theme.borders.borderRadiusMd },
              '&:hover fieldset': { borderColor: theme.colors.primary },
              '&.Mui-focused fieldset': { borderColor: theme.colors.primary, boxShadow: theme.effects.glowSubtle(theme.colors.primary) },
            },
            '& .MuiInputBase-input': { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyAccent },
          }}
        />
        <Box sx={{ width: '100%', mt: 1, display: 'flex', gap: 1 }}>
          <TextField
            label="Lat"
            value={profileData.latitude || ''}
            onChange={(e) => handleInputChange('latitude', e.target.value)}
            size="small"
            sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.7rem' } }}
          />
          <TextField
            label="Lon"
            value={profileData.longitude || ''}
            onChange={(e) => handleInputChange('longitude', e.target.value)}
            size="small"
            sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.7rem' } }}
          />
        </Box>
      </Box>
      <FormControlLabel
        control={
          <Checkbox
            checked={profileData.share_location_publicly}
            onChange={(e) => handleInputChange('share_location_publicly', e.target.checked)}
            sx={{
              color: theme.colors.primary,
              '&.Mui-checked': { color: theme.colors.primary },
            }}
          />
        }
        label={
          <Typography sx={{ color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyAccent, fontSize: '0.8rem' }}>
            Share location with community (Enables Volunteer Heatmap)
          </Typography>
        }
        sx={{ width: '100%', maxWidth: '400px', mb: 2 }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '400px', gap: 1, mb: 1 }}>
        <TextField
          label="Discord User ID"
          value={profileData.discord_user_id || ''}
          onChange={(e) => handleInputChange('discord_user_id', e.target.value)}
          margin="none"
          fullWidth
          sx={{
            flexGrow: 1,
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
        <Button
          variant="contained"
          onClick={handleSaveProfile}
          sx={{
            minWidth: '120px',
            height: '56px',
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
          Link Accounts
        </Button>
      </Box>
      {[0, 1].map((index) => (
        <TextField
          key={index}
          label={`Contact Link ${index + 1}`}
          value={profileData.contact_links[index] || ''}
          onChange={(e) => handleContactLinkChange(index, e.target.value)}
          margin="none"
          fullWidth
          sx={{
            maxWidth: '400px',
            mt: 1,
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
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            if (option.inputValue) return option.inputValue;
            return option.name || '';
          }}
          value={profileData.skills || []}
          filterOptions={(options, params) => {
            const filter = createFilterOptions();
            const filtered = filter(options, params);
            const { inputValue } = params;
            const isExisting = options.some((option) => inputValue.toLowerCase() === option.name.toLowerCase());
            if (inputValue !== '' && !isExisting) {
              filtered.push({
                inputValue,
                name: `+ Create Custom Skill: "${inputValue}"`,
              });
            }
            return filtered;
          }}
          onChange={(event, newValue) => {
            const processedValue = newValue.map(item => {
              if (typeof item === 'string') return { name: item };
              if (item.inputValue) return { name: item.inputValue };
              return item;
            });
            handleInputChange('skills', processedValue);
          }}
          freeSolo
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
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
            const item = typeof option === 'string' ? { name: option } : option;
        
            // Ensure we have a full skill object
            let fullSkill = skillsPool.find(skill => skill.name === item.name) || item;
        
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
          onClick={goToSkillConstellation}
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
          Skill Constellation
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/profile/skill-library')}
          sx={{
            borderColor: theme.colors.secondary,
            color: theme.colors.secondary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.secondary),
            '&:hover': {
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              backgroundColor: 'rgba(255, 92, 162, 0.1)',
              boxShadow: theme.effects.glowStrong(theme.colors.secondary),
            }
          }}
        >
          Skill Library
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/profile/interest-library')}
          sx={{
            borderColor: theme.colors.accentBlue,
            color: theme.colors.accentBlue,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.accentBlue),
            '&:hover': {
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              backgroundColor: 'rgba(77, 171, 247, 0.1)',
              boxShadow: theme.effects.glowStrong(theme.colors.accentBlue),
            }
          }}
        >
          Interest Library
        </Button>
        <Autocomplete
          multiple
          fullWidth
          options={interestsPool}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            if (option.inputValue) return option.inputValue;
            return option.name || '';
          }}
          value={profileData.interests || []}
          filterOptions={(options, params) => {
            const filter = createFilterOptions();
            const filtered = filter(options, params);
            const { inputValue } = params;
            const isExisting = options.some((option) => inputValue.toLowerCase() === option.name.toLowerCase());
            if (inputValue !== '' && !isExisting) {
              filtered.push({
                inputValue,
                name: `+ Create Custom Interest: "${inputValue}"`,
              });
            }
            return filtered;
          }}
          onChange={(event, newValue) => {
            const processedValue = newValue.map(item => {
              if (typeof item === 'string') return { name: item };
              if (item.inputValue) return { name: item.inputValue };
              return item;
            });
            handleInputChange('interests', processedValue);
          }}
          freeSolo
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
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
              const item = typeof option === 'string' ? { name: option } : option;
              return (
                <Chip key={key} label={item.name} {...otherProps} />
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
          padding: isMobile ? '8px' : '16px',
        }}
      >
        <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb:1, pt: isMobile ? 2 : 0 }}>
          Mission Log
        </Typography>
        
        <Box sx={{ width: '100%' }}>
            <UserPortfolio userId={profileData.id} accessToken={portfolioToken}/>
        </Box>
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

      {/* My Needs Panel */}
      <Box
        className="profile-needs-container"
        sx={{
          ...panelStyle,
          borderColor: theme.colors.primary,
          boxShadow: theme.effects.glowSubtle(theme.colors.primary),
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: theme.colors.primary,
            fontFamily: theme.typography.fontFamilyAccent,
            width: '100%',
            textAlign: 'center',
          }}
        >
          My Active Needs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setIsNeedModalOpen(true)}
            sx={{
              backgroundColor: theme.colors.accentGreen,
              color: theme.colors.backgroundDefault,
              fontFamily: theme.typography.fontFamilyAccent,
              '&:hover': { backgroundColor: '#00b870' }
            }}
          >
            Declare Need
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/needs')}
            sx={{
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilyAccent,
              '&:hover': { borderColor: theme.colors.accentBlue, color: theme.colors.accentBlue }
            }}
          >
            Explorer
          </Button>
        </Box>
        {needsLoading && <CircularProgress sx={{ color: theme.colors.primary, display: 'block', margin: 'auto' }} />}
        {!needsLoading && userNeeds.length === 0 && (
          <Typography sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.textSecondary}}>No active needs declared.</Typography>
        )}
        {!needsLoading && userNeeds.length > 0 && (
          <List sx={{width: '100%'}}>
            {userNeeds.slice(0, 3).map((need) => (
              <ListItem
                key={need.id}
                onClick={() => navigate(`/needs/${need.id}`)}
                sx={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                  mb: 1,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(28, 28, 30, 0.5)',
                  borderRadius: theme.borders.borderRadiusSm,
                  '&:hover': {
                    backgroundColor: 'rgba(28, 28, 30, 0.8)',
                  }
                }}
              >
                <ListItemText
                  primary={need.name}
                  secondary={`Status: ${need.status || 'open'} - Urgency: ${need.urgency || 'medium'}`}
                  primaryTypographyProps={{
                    sx: {
                      color: theme.colors.primary,
                      fontFamily: theme.typography.fontFamilyAccent,
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Communities Panel */}
      <Box
        className="profile-communities-container"
        sx={{
          ...panelStyle,
          borderColor: theme.colors.accentBlue,
          boxShadow: theme.effects.glowSubtle(theme.colors.accentBlue),
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            color: theme.colors.primary,
            fontFamily: theme.typography.fontFamilyAccent,
            width: '100%',
            textAlign: 'center',
          }}
        >
          My Realms
        </Typography>
        {communitiesLoading && <CircularProgress sx={{ color: theme.colors.primary, display: 'block', margin: 'auto' }} />}
        {!communitiesLoading && userCommunities.length === 0 && (
          <Typography sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.textSecondary}}>
            You haven't joined any realms yet.
          </Typography>
        )}
        {!communitiesLoading && userCommunities.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.md, width: '100%' }}>
            {userCommunities.map((community) => (
              <Box
                key={community.id}
                onClick={() => navigate(`/communityhub/${community.id}`)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: theme.spacing.sm,
                  backgroundColor: 'rgba(28, 28, 30, 0.5)',
                  borderRadius: theme.borders.borderRadiusMd,
                  border: `1px solid ${theme.colors.accentBlue}`,
                  minWidth: '120px',
                  cursor: 'pointer',
                  transition: '0.3s',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    boxShadow: theme.effects.glowSubtle(theme.colors.accentBlue),
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Typography variant="body2" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent }}>
                  {community.name}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamilyBase }}>
                  {community.members ? community.members.length : 0} Members
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Badges Panel */}
      <Box 
        className="profile-badges-container" 
        sx={{ 
          ...panelStyle,
          borderColor: theme.colors.accentPurple, // Example: use a different color for this panel
          boxShadow: theme.effects.glowSubtle(theme.colors.accentPurple),
        }}
      >
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{
            color: theme.colors.primary, 
            fontFamily: theme.typography.fontFamilyAccent,
            width: '100%', 
            textAlign: 'center',
          }}
        >
          My Badges
        </Typography>
        {badgesLoading && <CircularProgress sx={{ color: theme.colors.primary, display: 'block', margin: 'auto' }} />}
        {badgesError && <Typography color="error" sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.error}}>{badgesError}</Typography>}
        {!badgesLoading && !badgesError && userBadges.length === 0 && (
          <Typography sx={{fontFamily: theme.typography.fontFamilyBase, color: theme.colors.textSecondary}}>
            No badges earned yet. Keep engaging and completing tasks to earn them!
          </Typography>
        )}
        {!badgesLoading && !badgesError && userBadges.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.md, width: '100%' }}>
            {userBadges.map((badge) => (
              <Box 
                key={badge.id || badge.name} // Use badge.id if available, otherwise badge.name
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center',
                  padding: theme.spacing.sm,
                  backgroundColor: 'rgba(28, 28, 30, 0.5)', 
                  borderRadius: theme.borders.borderRadiusMd,
                  border: `1px solid ${theme.colors.accentPurple}`,
                  minWidth: '100px', // Ensure items have a minimum width
                }}
              >
                <Avatar
                  src={badge.icon || '/default-badge.png'}
                  alt={badge.name}
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    mb: 1, 
                    border: `2px solid ${theme.colors.accentPurple}`,
                    boxShadow: theme.effects.glowSubtle(theme.colors.accentPurple),
                  }}
                  imgProps={{
                    onError: (e) => {
                      e.target.onerror = null; 
                      e.target.src = '/default-badge.png';
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamilyBase }}>
                  {badge.name}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Command Module Panel */}
      <Box sx={{ ...panelStyle, flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', flexWrap: 'wrap', mb: isMobile ? 4 : theme.spacing.lg, gap: 2 }}>
        <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamilyAccent, width: '100%', textAlign: 'center', mb: 1 }}>
          Command Module
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleSaveProfile}
          fullWidth={isMobile}
          sx={{
            backgroundColor: theme.colors.primary,
            color: theme.colors.backgroundDefault,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.primary),
            borderRadius: theme.borders.borderRadiusMd,
            minHeight: '44px',
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
          onClick={handleShareProfile}
          fullWidth={isMobile}
          startIcon={<ShareIcon />}
          sx={{
            borderColor: theme.colors.primary,
            color: theme.colors.primary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.primary),
            borderRadius: theme.borders.borderRadiusMd,
            minHeight: '44px',
            '&:hover': {
              borderColor: theme.colors.accentBlue,
              color: theme.colors.accentBlue,
              backgroundColor: 'rgba(0, 243, 255, 0.1)',
              boxShadow: theme.effects.glowStrong(theme.colors.primary),
            }
          }}
        >
          Share Public Profile
        </Button>
        <Button 
          variant="outlined" 
          onClick={goToDashboard}
          fullWidth={isMobile}
          sx={{
            borderColor: theme.colors.secondary,
            color: theme.colors.secondary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.secondary),
            borderRadius: theme.borders.borderRadiusMd,
            minHeight: '44px',
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
          onClick={() => logout({ logoutParams: { returnTo: import.meta.env.VITE_FRONTEND_URL || window.location.origin } })}
          fullWidth={isMobile}
          sx={{ 
            backgroundColor: theme.colors.error, 
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.fontFamilyAccent,
            boxShadow: theme.effects.glowSubtle(theme.colors.error),
            borderRadius: theme.borders.borderRadiusMd,
            minHeight: '44px',
            '&:hover': { 
              backgroundColor: theme.colors.accentOrange, 
              boxShadow: theme.effects.glowStrong(theme.colors.error),
            } 
          }}
        >
          Logout
        </Button>
      </Box>

      {/* Need Form Modal */}
      <Modal
        open={isNeedModalOpen}
        onClose={() => setIsNeedModalOpen(false)}
      >
        <Paper sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '75%', md: '600px' },
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: theme.colors.backgroundPaper,
          boxShadow: theme.effects.glowStrong(theme.colors.primary),
          p: 4,
          borderRadius: theme.borders.borderRadiusLg,
          border: `1px solid ${theme.colors.primary}`,
        }}>
          <Typography variant="h5" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', mb: 3, textAlign: 'center' }}>
            DECLARE NEW NEED
          </Typography>
          <NeedDeclarationForm
            onSubmit={handleNeedSubmit}
            onCancel={() => setIsNeedModalOpen(false)}
            loggedInUserId={profileData.id}
          />
        </Paper>
      </Modal>

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
