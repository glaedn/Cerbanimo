// modules/ChronicleTimeline.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import StoryNode from './StoryNode';

const ChronicleTimeline = ({ stories }) => {
  const safeStories = Array.isArray(stories) ? stories : [];
  return (
    <Box sx={{ bgcolor: '#000', p: 2 }}>
      <Typography variant="h5" color="#0ff" mb={2}>Chronicle Timeline</Typography>
      {safeStories.length === 0 ? (
        <Typography color="#888">No stories to display.</Typography>
      ) : (
        safeStories.map((story) => (
          <StoryNode key={story.story_node_id} {...story} />
        ))
      )}
    </Box>
  );
};

export default ChronicleTimeline;