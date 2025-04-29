import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { TextField, Button, Box, Typography, Autocomplete, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { blue, red, green, orange, purple, teal, pink, indigo } from '@mui/material/colors';
import './CommunityCreation.css';

const CommunityCreation = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
        const response = await axios.get('http://localhost:4000/profile/options', {
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
            const response = await axios.get('http://localhost:4000/profile/userId', {
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

    const handleCreateCommunity = async () => {
      if (!name.trim()) {
        alert('Please enter a community name');
        return;
      }
    
      setIsLoading(true);
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
    
        const response = await axios.post('http://localhost:4000/communities/', {
          name: name,
          description: description,
          id: userId,
          tags: tagIds,
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      
        if (response.status === 201) {
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
    <Box className="community-creation-container">
      <Typography variant="h4" className="form-title">Create a New Community</Typography>
      
      <div className="cosmic-field-container">
        <TextField
          label="Community Name"
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
          required
          InputProps={{
            style: { color: 'white', backgroundColor: 'rgba(26, 9, 57, 0.9)', borderRadius: '10px' }
          }}
        />
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
          className="form-input"
          InputProps={{
            style: { color: 'white', backgroundColor: 'rgba(26, 9, 57, 0.9)', borderRadius: '10px' }
          }}
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
            <TextField {...params} variant="outlined" label="Interest Tags" placeholder="Add tags" className="form-input" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const label = typeof option === 'string' ? option : option.name;
              return (
                <Chip
                {...getTagProps({ index })}
                  key={index}
                  label={label}
                  style={{
                    backgroundColor: getRandomColorFromPalette(),
                    color: 'white',
                    margin: '2px',
                    textShadow: '0 0 10px rgba(0,0,0,0.8)',
                  }}
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
        className="create-button"
        disabled={isLoading}
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