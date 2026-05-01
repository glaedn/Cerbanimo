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
  InputLabel,
  Slider,
  Switch,
  FormControlLabel,
  Checkbox
} from '@mui/material';
// import './NeedDeclarationForm.css'; // CSS file can be created for additional styling

const NeedDeclarationForm = ({
  initialNeedData,
  onSubmit,
  onCancel,
  loggedInUserId,
  communityId
}) => {
  const urgencyLevels = ['low', 'medium', 'high', 'critical'];

  const getInitialFormData = () => ({
    name: '',
    description: '',
    category: '',
    quantity_needed: '',
    urgency: 'medium',
    urgency_level: 'medium',
    is_recurring: false,
    recurrence_pattern: { frequency: 'weekly', interval: 1 },
    location: { text: '', latitude: null, longitude: null, context: '' },
    mobility_required: false,
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
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' || type === 'switch' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' || type === 'switch' ? checked : value,
      }));
    }
  };

  const handleUrgencySliderChange = (event, newValue) => {
    const level = urgencyLevels[newValue];
    setFormData(prev => ({
      ...prev,
      urgency: level,
      urgency_level: level
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
          <Typography gutterBottom>Urgency Level</Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={urgencyLevels.indexOf(formData.urgency_level || 'medium')}
              step={1}
              marks
              min={0}
              max={3}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => urgencyLevels[value]}
              onChange={handleUrgencySliderChange}
            />
          </Box>
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
            label="Location Description"
            name="location.text"
            value={formData.location?.text || ''}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Location Context (e.g., Door code, nearby landmark)"
            name="location.context"
            value={formData.location?.context || ''}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.mobility_required}
                onChange={handleChange}
                name="mobility_required"
              />
            }
            label="Mobility Required (Requires travel/transport)"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_recurring}
                onChange={handleChange}
                name="is_recurring"
              />
            }
            label="Is Recurring Need?"
          />
        </Grid>
        {formData.is_recurring && (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  name="recurrence_pattern.frequency"
                  value={formData.recurrence_pattern?.frequency || 'weekly'}
                  onChange={handleChange}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Interval"
                name="recurrence_pattern.interval"
                type="number"
                value={formData.recurrence_pattern?.interval || 1}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          </>
        )}
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
