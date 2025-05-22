// modules/ChronicleTimeline.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import StoryNode from './StoryNode';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const ChronicleTimeline = ({ stories }) => {
  const safeStories = Array.isArray(stories) ? stories : [];
  const { user, getAccessTokenSilently } = useAuth0();
  const handleAddEndorsement = async (story_node_id, endorsement) => {
  
    try {
      const token = await getAccessTokenSilently({
        audience: 'http://localhost:4000', // Match the exact value from Auth0
        scope: 'openid profile email read:profile write:profile',
      });

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

      const res = await axios.post(
        'http://localhost:4000/endorsements/',
        {
          story_node_id,
          user_id: profileResponse.data.id, // Pass the Auth0 user id
          ...endorsement,
        },
        {
          headers: {
        Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        console.log('Endorsement added!');
        // Optional: trigger a UI update or refetch
      } else {
        console.warn('Endorsement response:', res.data);
      }
    } catch (error) {
      console.error('Failed to add endorsement:', error.response?.data || error.message);
      alert(error.response?.data?.error || 'Failed to add endorsement.');
    }
  };

  return (
    <Box sx={{ bgcolor: '#000', p: 2 }}>
      <Typography variant="h5" color="#0ff" mb={2}>
        Chronicle Timeline
      </Typography>
      {safeStories.length === 0 ? (
        <Typography color="#888">No stories to display.</Typography>
      ) : (
        safeStories.map((story) => (
          <StoryNode
            key={story.id}
            {...story}
            onAddEndorsement={(endorsement) =>
              handleAddEndorsement(story.id, endorsement)
            }
          />
        ))
      )}
    </Box>
  );
};

export default ChronicleTimeline;
