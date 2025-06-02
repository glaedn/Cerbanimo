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
  Chip,
  IconButton, // For delete icon on chips
  FormControlLabel,
  Checkbox, // Potentially for boolean constraints
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; // For chip deletion
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
    quantity_needed: '', // Will be numeric
    urgency: 'medium',
    required_before_date: '',
    location_text: '',
    latitude: '', // New
    longitude: '', // New
    tags: [], // New - array of strings
    constraints: {}, // New - object
    duration_type: '', // New - e.g., 'one_time', 'ongoing'
    duration_details: {}, // New - object, structure depends on duration_type
    status: initialNeedData?.status || 'open',
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [error, setError] = useState(null);
  const [currentTag, setCurrentTag] = useState('');
  const [currentConstraintKey, setCurrentConstraintKey] = useState('');
  const [currentConstraintValue, setCurrentConstraintValue] = useState('');
  // Local state for managing constraints before they are formed into an object for formData.constraints
  const [constraintsList, setConstraintsList] = useState([]);


  useEffect(() => {
    if (initialNeedData) {
      const initialConstraints = initialNeedData.constraints || {};
      const constraintsArray = Object.entries(initialConstraints).map(([key, value]) => ({ id: key, key, value })); // Add id for simple keying in map
      setConstraintsList(constraintsArray);

      const formattedData = {
        ...getInitialFormData(),
        ...initialNeedData,
        tags: initialNeedData.tags || [],
        constraints: initialConstraints,
        duration_details: initialNeedData.duration_details || {},
        latitude: initialNeedData.latitude !== null && initialNeedData.latitude !== undefined ? initialNeedData.latitude.toString() : '',
        longitude: initialNeedData.longitude !== null && initialNeedData.longitude !== undefined ? initialNeedData.longitude.toString() : '',
        quantity_needed: initialNeedData.quantity_needed !== null && initialNeedData.quantity_needed !== undefined ? initialNeedData.quantity_needed.toString() : '',
      };
      if (initialNeedData.required_before_date) {
        try {
          const date = new Date(initialNeedData.required_before_date);
          if (!isNaN(date.getTime())) {
            formattedData.required_before_date = date.toISOString().slice(0, 16);
          } else {
            formattedData.required_before_date = '';
          }
        } catch (e) {
          formattedData.required_before_date = '';
        }
      } else {
        formattedData.required_before_date = '';
      }
      setFormData(formattedData);
    } else {
      setFormData(getInitialFormData());
      setConstraintsList([]);
    }
  }, [initialNeedData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "latitude" || name === "longitude" || name === "quantity_needed") {
        // Allow only numbers and a single decimal point for these fields
        if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        return;
    }

    if (name?.startsWith("duration_details.")) {
      const detailKey = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        duration_details: {
          ...prev.duration_details,
          [detailKey]: type === 'checkbox' ? checked : value,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleAddTag = () => {
    if (currentTag && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, currentTag.trim()] }));
      setCurrentTag('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToDelete) }));
  };

  const handleAddConstraint = () => {
    if (currentConstraintKey.trim() && currentConstraintValue.trim()) {
      const newConstraint = { id: currentConstraintKey, key: currentConstraintKey.trim(), value: currentConstraintValue.trim() };
      // Avoid duplicate keys, replace if existing
      const existingIndex = constraintsList.findIndex(c => c.key === newConstraint.key);
      let updatedList;
      if (existingIndex > -1) {
        updatedList = [...constraintsList];
        updatedList[existingIndex] = newConstraint;
      } else {
        updatedList = [...constraintsList, newConstraint];
      }
      setConstraintsList(updatedList);

      // Update formData.constraints object
      const newConstraintsObject = updatedList.reduce((obj, item) => {
        // Attempt to parse value as boolean or number if appropriate
        let parsedValue = item.value;
        if (item.value.toLowerCase() === 'true') parsedValue = true;
        else if (item.value.toLowerCase() === 'false') parsedValue = false;
        else if (!isNaN(parseFloat(item.value)) && isFinite(item.value)) parsedValue = parseFloat(item.value);
        obj[item.key] = parsedValue;
        return obj;
      }, {});
      setFormData(prev => ({ ...prev, constraints: newConstraintsObject }));

      setCurrentConstraintKey('');
      setCurrentConstraintValue('');
    }
  };

  const handleDeleteConstraint = (constraintIdToDelete) => {
    const updatedList = constraintsList.filter(c => c.id !== constraintIdToDelete);
    setConstraintsList(updatedList);
    const newConstraintsObject = updatedList.reduce((obj, item) => {
        let parsedValue = item.value;
        if (item.value.toLowerCase() === 'true') parsedValue = true;
        else if (item.value.toLowerCase() === 'false') parsedValue = false;
        else if (!isNaN(parseFloat(item.value)) && isFinite(item.value)) parsedValue = parseFloat(item.value);
        obj[item.key] = parsedValue;
      return obj;
    }, {});
    setFormData(prev => ({ ...prev, constraints: newConstraintsObject }));
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

    const payload = {
        ...formData,
        quantity_needed: parseFloat(formData.quantity_needed) || null, // Ensure numeric
        latitude: parseFloat(formData.latitude) || null, // Ensure numeric
        longitude: parseFloat(formData.longitude) || null, // Ensure numeric
        // constraints are already an object
        // tags are already an array
        // duration_details is already an object
    };

    if (communityId) {
      payload.requestor_community_id = communityId;
      delete payload.requestor_user_id;
    } else {
      payload.requestor_user_id = loggedInUserId;
      delete payload.requestor_community_id;
    }

    if (formData.required_before_date && formData.required_before_date.trim() !== '') {
      try {
        payload.required_before_date = new Date(formData.required_before_date).toISOString();
      } catch (parseError) {
        setError('Invalid date format for "Required Before Date".');
        return;
      }
    } else {
      payload.required_before_date = null;
    }

    // Clean up duration_details if duration_type is not 'limited_frequency'
    if (payload.duration_type !== 'limited_frequency') {
        payload.duration_details = {};
    } else {
        // Ensure notes field is properly structured if it's the only detail for limited_frequency
        if(formData.duration_details.notes && Object.keys(formData.duration_details).length === 1){
            // This is fine, keep as is
        } else if (!formData.duration_details.notes && payload.duration_type === 'limited_frequency') {
            // If notes is empty but type is limited_frequency, perhaps set to empty object or specific structure
            payload.duration_details = { notes: '' }; // Or handle as per backend expectation
        }
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
            label="Quantity Needed"
            name="quantity_needed"
            type="number" // Changed to number
            value={formData.quantity_needed}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            helperText="Enter a numeric value (e.g., 1, 5, 2.5)"
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
            label="Location (General Area or Address)"
            name="location_text"
            value={formData.location_text}
            onChange={handleChange}
            fullWidth
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Latitude (Optional)"
            name="latitude"
            type="number"
            value={formData.latitude}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            helperText="e.g., 40.7128"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Longitude (Optional)"
            name="longitude"
            type="number"
            value={formData.longitude}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            helperText="e.g., -74.0060"
          />
        </Grid>

        {/* Tags Input */}
        <Grid item xs={12}> <Typography variant="subtitle1" sx={{mt: 1}}>Tags</Typography> </Grid>
        <Grid item xs={12} sm={8}>
          <TextField
            label="Add Tag"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button variant="outlined" onClick={handleAddTag} fullWidth sx={{height: '100%'}}>Add Tag</Button>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {formData.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleDeleteTag(tag)}
                deleteIcon={<DeleteIcon />}
              />
            ))}
          </Box>
        </Grid>

        {/* Constraints Input */}
        <Grid item xs={12}> <Typography variant="subtitle1" sx={{mt: 1}}>Constraints (Key-Value Pairs)</Typography> </Grid>
        <Grid item xs={12} sm={5}>
            <TextField label="Constraint Key" value={currentConstraintKey} onChange={(e) => setCurrentConstraintKey(e.target.value)} fullWidth variant="outlined" size="small"/>
        </Grid>
        <Grid item xs={12} sm={5}>
            <TextField label="Constraint Value" value={currentConstraintValue} onChange={(e) => setCurrentConstraintValue(e.target.value)} fullWidth variant="outlined" size="small" helperText="true, false, numbers, or text"/>
        </Grid>
        <Grid item xs={12} sm={2}>
            <Button variant="outlined" onClick={handleAddConstraint} fullWidth sx={{height: '100%'}}>Add</Button>
        </Grid>
        <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {constraintsList.map((constraint) => (
                    <Chip
                        key={constraint.id}
                        label={`${constraint.key}: ${constraint.value.toString()}`}
                        onDelete={() => handleDeleteConstraint(constraint.id)}
                        deleteIcon={<DeleteIcon />}
                    />
                ))}
            </Box>
        </Grid>

        {/* Duration Input */}
        <Grid item xs={12}> <Typography variant="subtitle1" sx={{mt: 1}}>Duration</Typography> </Grid>
        <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
                <InputLabel id="duration-type-label">Duration Type</InputLabel>
                <Select
                    labelId="duration-type-label"
                    name="duration_type"
                    value={formData.duration_type}
                    onChange={handleChange}
                    label="Duration Type"
                >
                    <MenuItem value=""><em>Select a type</em></MenuItem>
                    <MenuItem value="one_time">One-Time</MenuItem>
                    <MenuItem value="ongoing">Ongoing</MenuItem>
                    <MenuItem value="limited_frequency">Limited Frequency</MenuItem>
                </Select>
            </FormControl>
        </Grid>
        {formData.duration_type === 'limited_frequency' && (
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Frequency Details / Notes"
                    name="duration_details.notes" // Special handling in handleChange
                    value={formData.duration_details.notes || ''}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    helperText="e.g., Twice a week on Mondays and Wednesdays"
                />
            </Grid>
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
