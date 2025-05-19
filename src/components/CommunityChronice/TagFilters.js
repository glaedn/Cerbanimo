import React from 'react';
import { Box, Chip } from '@mui/material';

const TagFilters = ({ tags = [], selected, setSelected }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
    {tags.map(tag => (
      <Chip
        key={tag}
        label={tag}
        onClick={() =>
          setSelected(selected === tag ? '' : tag)
        }
        color={selected === tag ? 'primary' : 'default'}
        sx={{ bgcolor: selected === tag ? '#0ff' : '#333', color: '#fff' }}
      />
    ))}
  </Box>
);

export default TagFilters;
