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
        audience: import.meta.env.VITE_BACKEND_URL, // Match the exact value from Auth0
        scope: 'openid profile email read:profile write:profile',
      });

      // Use the token for authorized requests
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

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/endorsements/`,
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

  const summaries = safeStories.filter(s => s.summary_type === 'weekly wrap-up');
  const chronicleNodes = safeStories.filter(s => s.summary_type !== 'weekly wrap-up');

  return (
    <Box sx={{ bgcolor: 'background.default', p: 2 }}>
      {summaries.length > 0 && (
        <>
          <Typography variant="h5" color="secondary" sx={{ fontFamily: 'Orbitron', mb: 2 }}>
            Chronicle Summaries
          </Typography>
          {summaries.map((summary) => (
            <Box
              key={summary.id}
              sx={{
                mb: 3,
                p: 3,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.1) 0%, rgba(255, 92, 162, 0.1) 100%)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: 'linear-gradient(to bottom, #00f3ff, #ff5ca2)'
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="overline" sx={{ color: '#00f3ff', fontWeight: 'bold', letterSpacing: 2 }}>
                  WEEKLY_CHRONICLE_WRAPUP
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  {new Date(summary.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Typography variant="body1" sx={{ color: '#fff', fontStyle: 'italic', mb: 3, lineHeight: 1.6 }}>
                "{summary.content}"
              </Typography>

              {summary.structured_data && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {summary.structured_data.top_skill_focus && (
                    <Box sx={{ bgcolor: 'rgba(0, 243, 255, 0.1)', p: 1, px: 2, borderRadius: 1, border: '1px solid #00f3ff' }}>
                      <Typography variant="caption" display="block" sx={{ color: '#00f3ff', fontSize: '0.6rem' }}>TOP_SKILL</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>{summary.structured_data.top_skill_focus}</Typography>
                    </Box>
                  )}
                  {summary.structured_data.weekly_momentum && (
                    <Box sx={{ bgcolor: 'rgba(255, 92, 162, 0.1)', p: 1, px: 2, borderRadius: 1, border: '1px solid #ff5ca2' }}>
                      <Typography variant="caption" display="block" sx={{ color: '#ff5ca2', fontSize: '0.6rem' }}>MOMENTUM</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold', textTransform: 'uppercase' }}>{summary.structured_data.weekly_momentum}</Typography>
                    </Box>
                  )}
                  {summary.structured_data.growth_insight && (
                    <Box sx={{ width: '100%', mt: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                      <Typography variant="caption" display="block" sx={{ color: '#aaa', fontSize: '0.6rem', mb: 0.5 }}>GROWTH_INSIGHT</Typography>
                      <Typography variant="body2" sx={{ color: '#e0e0e0' }}>{summary.structured_data.growth_insight}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </>
      )}

      <Typography variant="h5" color="primary" sx={{ fontFamily: 'Orbitron', mb: 2 }}>
        Chronicle Timeline
      </Typography>
      {chronicleNodes.length === 0 ? (
        <Typography color="textSecondary">No stories to display.</Typography>
      ) : (
        chronicleNodes.map((story) => (
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
