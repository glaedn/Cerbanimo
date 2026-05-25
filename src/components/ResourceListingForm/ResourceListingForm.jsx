import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  InputLabel,
  FormControl,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
// import './ResourceListingForm.css'; // CSS file can be created for additional styling if needed

const ResourceListingForm = ({ initialResourceData, onSubmit, onCancel }) => {
  const { getAccessTokenSilently } = useAuth0();
  const getInitialFormData = () => ({
    name: '',
    description: '',
    category: '',
    quantity: '',
    condition: '',
    availability_window_start: '',
    availability_window_end: '',
    location_text: '',
    is_recurring: false,
    recurring_details: '',
    price: '',
    status: 'available', // Default status
    // Ensure all fields from initialResourceData are considered or have defaults
    latitude: null,
    longitude: null,
    owner_user_id: null,
    owner_community_id: null,
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Geocoding State
  const [locationSearch, setLocationSearch] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);

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

  useEffect(() => {
    if (initialResourceData) {
      // Convert nulls to empty strings for controlled inputs if necessary
      const processedData = { ...getInitialFormData(), ...initialResourceData };
      for (const key in processedData) {
        if (processedData[key] === null && key !== 'latitude' && key !== 'longitude' && key !== 'owner_user_id' && key !== 'owner_community_id') {
          processedData[key] = '';
        }
        if (key === 'availability_window_start' || key === 'availability_window_end') {
            if (processedData[key]) {
                // Format date for datetime-local input
                const date = new Date(processedData[key]);
                // Check if date is valid before trying to format
                if (!isNaN(date.getTime())) {
                    processedData[key] = date.toISOString().slice(0, 16);
                } else {
                    processedData[key] = ''; // Set to empty if date is invalid
                }
            } else {
                processedData[key] = '';
            }
        }
      }
      setFormData(processedData);
    } else {
      setFormData(getInitialFormData()); // Reset to initial if no data
    }
  }, [initialResourceData]);

  const handleLocationSelect = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        location_text: newValue.displayName || '',
        latitude: newValue.latitude,
        longitude: newValue.longitude
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location_text: '',
        latitude: null,
        longitude: null
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Resource name is required.');
      return;
    }
    // Convert datetime-local strings back to ISO format or suitable format for backend
    const dataToSubmit = {
        ...formData,
        availability_window_start: formData.availability_window_start ? new Date(formData.availability_window_start).toISOString() : null,
        availability_window_end: formData.availability_window_end ? new Date(formData.availability_window_end).toISOString() : null,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ccc', borderRadius: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        {initialResourceData ? 'Edit Resource' : 'List a New Resource'}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Resource Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Price (Galactic Credits)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            helperText="Optional: Leave blank for free/shared use"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Quantity (e.g., 1 unit, 5 hours, 10 kg)"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Condition (e.g., New, Used - Good)"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
           <FormControl fullWidth variant="outlined">
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              name="status"
              value={formData.status}
              onChange={handleChange}
              label="Status"
            >
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="reserved">Reserved</MenuItem>
              <MenuItem value="exchanged">Exchanged</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Availability Start"
            name="availability_window_start"
            type="datetime-local"
            value={formData.availability_window_start}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Availability End"
            name="availability_window_end"
            type="datetime-local"
            value={formData.availability_window_end}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            fullWidth
            options={locationOptions}
            getOptionLabel={(option) => option.displayName || ''}
            loading={isGeocoding}
            onInputChange={(event, newInputValue) => setLocationSearch(newInputValue)}
            onChange={handleLocationSelect}
            value={formData.location_text ? { displayName: formData.location_text } : null}
            isOptionEqualToValue={(option, value) => option.displayName === value.displayName}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Location (City, Address...)"
                placeholder="Start typing..."
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <LocationOnIcon sx={{ color: 'primary.main', mr: 1 }} />
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
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Checkbox checked={formData.is_recurring} onChange={handleChange} name="is_recurring" color="primary" />}
            label="Is this resource recurring?"
          />
        </Grid>
        {formData.is_recurring && (
          <Grid item xs={12}>
            <TextField
              label="Recurring Details"
              name="recurring_details"
              value={formData.recurring_details}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              variant="outlined"
            />
          </Grid>
        )}
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained" color="primary">
          {initialResourceData ? 'Save Changes' : 'List Resource'}
        </Button>
      </Box>
    </Box>
  );
};

export default ResourceListingForm;
