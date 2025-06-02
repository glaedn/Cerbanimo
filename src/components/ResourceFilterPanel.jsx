import React, { useState, useEffect } from 'react';
import { Box, TextField, Checkbox, FormControlLabel, Typography, Paper, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

const ResourceFilterPanel = ({ onFilterChange, initialFilters = {} }) => {
  const [category, setCategory] = useState(initialFilters.category || '');
  const [tags, setTags] = useState(initialFilters.tags || ''); // Comma-separated string
  const [availableNow, setAvailableNow] = useState(initialFilters.available_now || false);
  const [verifiedOwner, setVerifiedOwner] = useState(initialFilters.verified_owner || false);
  // Add other relevant filters like duration_type if needed for resources/needs
  const [durationType, setDurationType] = useState(initialFilters.duration_type || '');


  // Debounce filter changes to avoid rapid API calls if user is typing
  useEffect(() => {
    const handler = setTimeout(() => {
      const filtersToApply = {
        category: category || null, // Send null if empty to clear filter
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Array of non-empty tags
        available_now: availableNow,
        verified_owner: verifiedOwner,
        duration_type: durationType || null,
      };
      // Remove null/empty/false filters to keep query clean, unless backend handles them
      Object.keys(filtersToApply).forEach(key => {
        if (filtersToApply[key] === null || filtersToApply[key] === '' || filtersToApply[key] === false || (Array.isArray(filtersToApply[key]) && filtersToApply[key].length === 0) ) {
          // For boolean false, we want to send it if it's explicitly set by a checkbox
          // For other falsey values, it means "no filter selected" for that criterion.
          if (key !== 'available_now' && key !== 'verified_owner') {
            delete filtersToApply[key];
          }
        }
      });
      onFilterChange(filtersToApply);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [category, tags, availableNow, verifiedOwner, durationType, onFilterChange]);

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(0,0,0,0.05)' }} elevation={1}>
      <Typography variant="h6" gutterBottom>
        Filter Options
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Category"
          variant="outlined"
          size="small"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Goods, Services"
        />
        <TextField
          label="Tags (comma-separated)"
          variant="outlined"
          size="small"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., urgent, medical, food"
        />
        <FormControl variant="outlined" size="small">
            <InputLabel id="duration-type-filter-label">Duration Type</InputLabel>
            <Select
                labelId="duration-type-filter-label"
                value={durationType}
                onChange={(e) => setDurationType(e.target.value)}
                label="Duration Type"
            >
                <MenuItem value=""><em>Any Duration</em></MenuItem>
                <MenuItem value="one_time">One-Time</MenuItem>
                <MenuItem value="ongoing">Ongoing</MenuItem>
                <MenuItem value="limited_frequency">Limited Frequency</MenuItem>
            </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={availableNow}
              onChange={(e) => setAvailableNow(e.target.checked)}
            />
          }
          label="Available Now (for Resources)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={verifiedOwner}
              onChange={(e) => setVerifiedOwner(e.target.checked)}
            />
          }
          label="Verified Owner Only"
        />
      </Box>
    </Paper>
  );
};

export default ResourceFilterPanel;
