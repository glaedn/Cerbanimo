// modules/FilterPanel.js
import React from 'react';
import { Box, TextField, MenuItem, Paper, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import './FilterPanel.css'; // Assuming you have a CSS file for styles  

const FilterPanel = ({ filters, setFilters, skills = [], projects = [], communities = [] }) => {
  return (
    <Paper sx={{ p: 2, bgcolor: '#111', color: '#fff' }}>
      <Typography variant="h6" sx={{ color: '#0ff' }}>Filters</Typography>
      <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
        <TextField
          className="filter-input"
          select
          label="Skill"
          value={filters.skill || ''}
          onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
          sx={{
            minWidth: 120,
            '& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiSelect-icon, & .MuiOutlinedInput-notchedOutline': {
              color: '#82aaff',
              borderColor: '#82aaff',
            },
            '& .MuiInputLabel-root': { color: '#82aaff' },
            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: '#82aaff' },
            '& .MuiSelect-icon': { color: '#82aaff' },
          }}
          InputProps={{
            sx: { color: '#82aaff' }
          }}
          InputLabelProps={{
            sx: { color: '#82aaff' }
          }}
        >
          <MenuItem value="" sx={{ color: '#82aaff' }}>All</MenuItem>
          {skills.map(skill => <MenuItem key={skill} value={skill} sx={{ color: '#82aaff' }}>{skill}</MenuItem>)}
        </TextField>

        <TextField
          className="filter-input"
          select
          label="Project"
          value={filters.project || ''}
          onChange={(e) => setFilters({ ...filters, project: e.target.value })}
          sx={{
            minWidth: 120,
            '& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiSelect-icon, & .MuiOutlinedInput-notchedOutline': {
              color: '#82aaff',
              borderColor: '#82aaff',
            },
            '& .MuiInputLabel-root': { color: '#82aaff' },
            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: '#82aaff' },
            '& .MuiSelect-icon': { color: '#82aaff' },
          }}
          InputProps={{
            sx: { color: '#82aaff' }
          }}
          InputLabelProps={{
            sx: { color: '#82aaff' }
          }}
        >
          <MenuItem value="" sx={{ color: '#82aaff' }}>All</MenuItem>
          {projects.map(p => <MenuItem key={p} value={p} sx={{ color: '#82aaff' }}>{p}</MenuItem>)}
        </TextField>

        <TextField
          className="filter-input"
          select
          label="Community"
          value={filters.community || ''}
          onChange={(e) => setFilters({ ...filters, community: e.target.value })}
          sx={{
            minWidth: 120,
            '& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiSelect-icon, & .MuiOutlinedInput-notchedOutline': {
              color: '#82aaff',
              borderColor: '#82aaff',
            },
            '& .MuiInputLabel-root': { color: '#82aaff' },
            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: '#82aaff' },
            '& .MuiSelect-icon': { color: '#82aaff' },
          }}
          InputProps={{
            sx: { color: '#82aaff' }
          }}
          InputLabelProps={{
            sx: { color: '#82aaff' }
          }}
        >
          <MenuItem value="" sx={{ color: '#82aaff' }}>All</MenuItem>
          {communities.map(c => <MenuItem key={c} value={c} sx={{ color: '#82aaff' }}>{c}</MenuItem>)}
        </TextField>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DatePicker
            className="filter-input"
            label="Start Date"
            value={filters.dateRange?.[0] || null}
            onChange={(newValue) => {
              setFilters({
                ...filters,
                dateRange: [newValue, filters.dateRange?.[1] || null],
              });
            }}
            slotProps={{
              textField: {
                sx: {
                  minWidth: 120,
                  '& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiOutlinedInput-notchedOutline': {
                    color: '#82aaff',
                    borderColor: '#82aaff',
                  },
                  '& .MuiInputLabel-root': { color: '#82aaff' },
                  '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: '#82aaff' },
                },
                InputProps: { sx: { color: '#82aaff' } },
                InputLabelProps: { sx: { color: '#82aaff' } },
              }
            }}
          />
          <Box sx={{ mx: 2, color: '#82aaff' }}>to</Box>
          <DatePicker
            className="filter-input"
            label="End Date"
            value={filters.dateRange?.[1] || null}
            onChange={(newValue) => {
              setFilters({
                ...filters,
                dateRange: [filters.dateRange?.[0] || null, newValue],
              });
            }}
            slotProps={{
              textField: {
                sx: {
                  minWidth: 120,
                  '& .MuiInputBase-input, & .MuiInputLabel-root, & .MuiOutlinedInput-notchedOutline': {
                    color: '#82aaff',
                    borderColor: '#82aaff',
                  },
                  '& .MuiInputLabel-root': { color: '#82aaff' },
                  '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': { borderColor: '#82aaff' },
                },
                InputProps: { sx: { color: '#82aaff' } },
                InputLabelProps: { sx: { color: '#82aaff' } },
              }
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default FilterPanel;