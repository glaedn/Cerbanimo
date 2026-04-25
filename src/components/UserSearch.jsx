import React, { useState, useEffect } from 'react';
import { TextField, Autocomplete, Avatar, Box, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';

const UserSearch = ({ sx = {} }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    if (inputValue.length < 2) {
      setOptions([]);
      return undefined;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile/search?q=${inputValue}`);
        if (active) {
          setOptions(response.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue]);

  return (
    <Autocomplete
      id="user-search"
      sx={{ width: 300, ...sx }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => option.username}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(event, newValue) => {
        if (newValue) {
          navigate(`/profile/public/${newValue.id}`);
        }
      }}
      renderOption={(props, option) => (
        <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
          <Avatar
            src={option.profile_picture || '/default-avatar.png'}
            sx={{ width: 30, height: 30, mr: 2 }}
          />
          <Typography variant="body2">{option.username}</Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Operatives"
          variant="outlined"
          size="small"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
            sx: {
              fontFamily: 'Orbitron',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00f3ff',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ff5ca2',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#00f3ff',
              },
              color: 'white',
            }
          }}
          InputLabelProps={{
            sx: {
              color: 'rgba(0, 243, 255, 0.7)',
              fontFamily: 'Orbitron',
              '&.Mui-focused': {
                color: '#00f3ff',
              }
            }
          }}
        />
      )}
    />
  );
};

export default UserSearch;
