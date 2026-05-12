import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { TextField, Button, Box, Typography, Autocomplete, Chip, FormControlLabel, Checkbox, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import { useIsMobile } from '../hooks/useIsMobile';
import './CommunityCreation.css';

const CommunityCreation = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Geocoding State
  const [locationSearch, setLocationSearch] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [userId, setUserId] = useState(null); // State to store user ID

  const colorPalette = [
    blue[300], red[300], green[300], orange[300], purple[300], teal[300], pink[300], indigo[300],
    blue[500], red[500], green[500], orange[500], purple[500], teal[500], pink[500], indigo[500],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/options`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAvailableTags(response.data.interestsPool);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };
    fetchTags();
  }, [getAccessTokenSilently]);

  // fetch the user's id from the backend
    useEffect(() => {
        const fetchUserId = async () => {
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/userId`, {
            headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data && response.data.id) {
                setUserId(response.data.id);
            } else {
                console.error('Invalid response format:', response.data);
                alert('Error fetching user ID. Please try again.');
            }
        } catch (error) {
            console.error('Failed to fetch user ID:', error);
            alert('Error fetching user ID. Please try again.');
        }
        };
        fetchUserId();
    }, [getAccessTokenSilently]);

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
        setCity(newValue.address.city || '');
        setState(newValue.address.state || '');
        setCountry(newValue.address.country || '');
        setLatitude(newValue.latitude);
        setLongitude(newValue.longitude);
      }
    };

    const handleCreateCommunity = async () => {
      if (!name.trim()) {
        alert('Please enter a community name');
        return;
      }
    
      setIsLoading(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      try {
        const token = await getAccessTokenSilently();
    
        // Extract tag IDs - handles both strings and objects
        const tagIds = selectedTags.map(tag => {
          if (typeof tag === 'string') {
            // Find matching tag object
            const foundTag = availableTags.find(t => t.name === tag);
            return foundTag ? foundTag.id : null;
          }
          return tag.id; // If it's already an object
        }).filter(id => id !== null);
    
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/communities/`, {
          name: name,
          description: description,
          id: userId,
          tags: tagIds,
          latitude: latitude,
          longitude: longitude,
          city: city,
          state: state,
          country: country,
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      
        if (response.status === 201) {
          if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
          alert('Community created successfully!');
          navigate(`/communityhub/${response.data.communityId}`);
        }
      } catch (error) {
        console.error('Failed to create community:', error);
        alert('Error creating community. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <Box className="community-creation-container" sx={{
      padding: isMobile ? '16px' : '20px',
      paddingTop: isMobile ? '40px' : '60px',
      pb: isMobile ? '100px' : '20px'
    }}>
      <Typography variant={isMobile ? "h5" : "h4"} className="form-title" sx={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }}>
        Create a New Community
      </Typography>
      
      <div className="cosmic-field-container">
        <TextField
          label="Community Name"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          margin="normal"
        />
        <div className="cosmic-glow"></div>
      </div>
      
      <div className="cosmic-field-container">
        <Autocomplete
          fullWidth
          options={locationOptions}
          getOptionLabel={(option) => option.displayName || ''}
          loading={isGeocoding}
          onInputChange={(event, newInputValue) => setLocationSearch(newInputValue)}
          onChange={handleLocationSelect}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Anchor Location (City, Address...)"
              placeholder="Establishing spatial coordinates..."
              variant="outlined"
              margin="normal"
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <LocationOnIcon sx={{ color: '#00F3FF', mr: 1 }} />
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
      </div>

      <div className="cosmic-field-container">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            <TextField
                label="City"
                variant="outlined"
                fullWidth
                value={city}
                onChange={(e) => setCity(e.target.value)}
                margin="normal"
                sx={{ flex: '1 1 100%' }}
            />
            <TextField
                label="State / Region"
                variant="outlined"
                fullWidth
                value={state}
                onChange={(e) => setState(e.target.value)}
                margin="normal"
                sx={{ flex: '1 1 45%' }}
            />
            <TextField
                label="Country"
                variant="outlined"
                fullWidth
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                margin="normal"
                sx={{ flex: '1 1 45%' }}
            />
            <TextField
                label="Latitude"
                variant="outlined"
                fullWidth
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                margin="normal"
                sx={{ flex: '1 1 45%' }}
            />
            <TextField
                label="Longitude"
                variant="outlined"
                fullWidth
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                margin="normal"
                sx={{ flex: '1 1 45%' }}
            />
        </Box>
        <div className="cosmic-glow"></div>
      </div>

      <div className="cosmic-field-container">
        <TextField
          label="Community Description"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
        />
        <div className="cosmic-glow"></div>
      </div>
      
      <div className="cosmic-field-container">
        <Autocomplete
          multiple
          options={availableTags}
          getOptionLabel={(option) => 
            typeof option === 'string' ? option : option.name || ''
          }
          value={selectedTags}
          onChange={(event, newValue) => setSelectedTags(newValue)}
          freeSolo
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Interest Tags" placeholder="Add tags" margin="normal" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const label = typeof option === 'string' ? option : option.name;
              return (
                <Chip
                {...getTagProps({ index })}
                  key={index}
                  label={label}
                  sx={{ margin: '2px' }}
                />
              );
            })
          }
        />
        <div className="cosmic-glow"></div>
      </div>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleCreateCommunity}
        disabled={isLoading}
        fullWidth={isMobile}
        sx={{
          marginTop: 3,
          paddingY: '12px',
          paddingX: '24px',
          fontWeight: 'bold',
          height: isMobile ? '56px' : 'auto',
          fontSize: isMobile ? '1.1rem' : '1rem'
        }}
      >
        {isLoading ? 'Creating...' : 'Launch Community'}
      </Button>
      
      <div className="space-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>
    </Box>
  );
};

export default CommunityCreation;