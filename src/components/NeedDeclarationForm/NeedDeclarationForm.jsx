import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel
} from '@mui/material';
// import './NeedDeclarationForm.css'; // CSS file can be created for additional styling

const NeedDeclarationForm = ({
  initialNeedData,
  onSubmit,
  onCancel,
  loggedInUserId,
  communityId
}) => {
  const getInitialFormData = () => ({
    name: '',
    description: '',
    category: '',
    quantity_needed: '',
    urgency: 'medium',
    required_before_date: '',
    location_text: '',
    // Fields not directly in form but part of need data structure
    status: initialNeedData?.status || 'open', // Default to open or carry over existing status
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialNeedData) {
      const formattedData = { ...getInitialFormData(), ...initialNeedData };
      if (initialNeedData.required_before_date) {
        try {
          const date = new Date(initialNeedData.required_before_date);
          if (!isNaN(date.getTime())) {
            formattedData.required_before_date = date.toISOString().slice(0, 16);
          } else {
            formattedData.required_before_date = ''; // Invalid date from backend
          }
        } catch (e) {
          formattedData.required_before_date = ''; // Error during date parsing
        }
      } else {
        formattedData.required_before_date = '';
      }
      setFormData(formattedData);
    } else {
      setFormData(getInitialFormData()); // Reset for new form
    }
  }, [initialNeedData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Need name is required.');
      return;
    }

    if (!communityId && !loggedInUserId) {
      setError('Cannot submit need: Missing requestor (user or community).');
      return;
    }

    const payload = { ...formData };

    if (communityId) {
      payload.requestor_community_id = communityId;
      // Ensure requestor_user_id is not sent if it's purely a community need,
      // unless the schema explicitly allows user associated with community need.
      // For now, we remove it if communityId is present.
      delete payload.requestor_user_id; 
    } else {
      console.log('Submitting need for user:', loggedInUserId);
      payload.requestor_user_id = loggedInUserId;
      delete payload.requestor_community_id;
    }

    // Handle date conversion for submission
    if (formData.required_before_date && formData.required_before_date.trim() !== '') {
      try {
        payload.required_before_date = new Date(formData.required_before_date).toISOString();
      } catch (parseError) {
        setError('Invalid date format for "Required Before Date". Please check the date.');
        return;
      }
    } else {
      payload.required_before_date = null; // Send null if empty or just whitespace
    }
    
    onSubmit(payload);
  };

  const formTitle = initialNeedData ? 'Edit Need' : 'Declare a New Need';
  const submitButtonText = initialNeedData ? 'Save Changes' : 'Declare Need';
  const forWhom = communityId ? `for Community ID: ${communityId}` : (loggedInUserId ? `for User ID: ${loggedInUserId}` : '');


  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ccc', borderRadius: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 1 }}>
        {formTitle}
      </Typography>
      {forWhom && <Typography variant="caption" color="textSecondary" display="block" sx={{mb:2}}>{forWhom}</Typography>}
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Name of Need"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            variant="outlined"
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
            label="Category (e.g., Services, Goods, Information)"
            name="category"
            value={formData.category}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Quantity Needed (e.g., 1 item, 2 hours, 5 responses)"
            name="quantity_needed"
            value={formData.quantity_needed}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="urgency-select-label">Urgency</InputLabel>
            <Select
              labelId="urgency-select-label"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              label="Urgency"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Required Before Date (Optional)"
            name="required_before_date"
            type="datetime-local"
            value={formData.required_before_date}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Location (General Area or Address if applicable)"
            name="location_text"
            value={formData.location_text}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
      </Grid>

      {error && (
        <Typography color="error" sx={{ mt: 2, mb: 1, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ mr: 1 }}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained" color="primary">
          {submitButtonText}
        </Button>
      </Box>
    </Box>
  );
};

NeedDeclarationForm.propTypes = {
  initialNeedData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  loggedInUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default NeedDeclarationForm;
