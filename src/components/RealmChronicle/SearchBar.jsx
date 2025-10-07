import React from 'react';
import { TextField } from '@mui/material';

const SearchBar = ({ search, setSearch }) => (
  <TextField
    fullWidth
    variant="outlined"
    placeholder="Search stories..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    sx={{ bgcolor: '#111', input: { color: '#0ff' }, mb: 2 }}
  />
);

export default SearchBar;
