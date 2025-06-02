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
  Chip, // Added
  IconButton, // Added
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; // Added
// import './ResourceListingForm.css'; // CSS file can be created for additional styling if needed

const ResourceListingForm = ({ initialResourceData, onSubmit, onCancel, loggedInUserId, communityId }) => { // Added loggedInUserId, communityId
  const getInitialFormData = () => ({
    name: '',
    description: '',
    category: '',
    quantity: '', // Will be numeric
    condition: '',
    availability_window_start: '',
    availability_window_end: '',
    location_text: '',
    latitude: '', // New
    longitude: '', // New
    is_recurring: false, // Retained for basic recurrence, could be integrated with duration_type
    recurring_details: '', // Retained
    tags: [], // New
    constraints: {}, // New
    duration_type: '', // New
    duration_details: {}, // New
    status: 'available',
    owner_user_id: loggedInUserId || null, // Set based on props
    owner_community_id: communityId || null, // Set based on props
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [error, setError] = useState(null); // Added error state
  const [currentTag, setCurrentTag] = useState('');
  const [currentConstraintKey, setCurrentConstraintKey] = useState('');
  const [currentConstraintValue, setCurrentConstraintValue] = useState('');
  const [constraintsList, setConstraintsList] = useState([]);


  useEffect(() => {
    if (initialResourceData) {
      const initialConstraints = initialResourceData.constraints || {};
      const constraintsArray = Object.entries(initialConstraints).map(([key, value]) => ({ id: key, key, value }));
      setConstraintsList(constraintsArray);

      const processedData = {
         ...getInitialFormData(),
         ...initialResourceData,
         tags: initialResourceData.tags || [],
         constraints: initialConstraints,
         duration_details: initialResourceData.duration_details || {},
         latitude: initialResourceData.latitude !== null && initialResourceData.latitude !== undefined ? initialResourceData.latitude.toString() : '',
         longitude: initialResourceData.longitude !== null && initialResourceData.longitude !== undefined ? initialResourceData.longitude.toString() : '',
         quantity: initialResourceData.quantity !== null && initialResourceData.quantity !== undefined ? initialResourceData.quantity.toString() : '',
         // Ensure owner_user_id and owner_community_id are correctly set if editing
         owner_user_id: initialResourceData.owner_user_id || loggedInUserId || null,
         owner_community_id: initialResourceData.owner_community_id || communityId || null,
        };

      ['availability_window_start', 'availability_window_end'].forEach(key => {
        if (processedData[key]) {
          const date = new Date(processedData[key]);
          if (!isNaN(date.getTime())) {
            processedData[key] = date.toISOString().slice(0, 16);
          } else {
            processedData[key] = '';
          }
        } else {
            processedData[key] = '';
        }
      });
      setFormData(processedData);
    } else {
      // When creating a new form, ensure owner IDs are set from props
      const initialFormState = getInitialFormData();
      initialFormState.owner_user_id = loggedInUserId || null;
      initialFormState.owner_community_id = communityId || null;
      setFormData(initialFormState);
      setConstraintsList([]);
    }
  }, [initialResourceData, loggedInUserId, communityId]); // Added dependencies

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "latitude" || name === "longitude" || name === "quantity") {
        if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        return;
    }

    if (name?.startsWith("duration_details.")) {
      const detailKey = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        duration_details: { ...prev.duration_details, [detailKey]: type === 'checkbox' ? checked : value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      const existingIndex = constraintsList.findIndex(c => c.key === newConstraint.key);
      let updatedList = existingIndex > -1 ? [...constraintsList] : [...constraintsList, newConstraint];
      if(existingIndex > -1) updatedList[existingIndex] = newConstraint;

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
    setError(null); // Clear previous errors
    if (!formData.name.trim()) {
      setError('Resource name is required.'); // Use setError
      return;
    }
    if (!formData.owner_user_id && !formData.owner_community_id) {
        setError('Resource must have an owner (user or community).');
        return;
    }

    const dataToSubmit = {
        ...formData,
        quantity: parseFloat(formData.quantity) || null, // Ensure numeric
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        availability_window_start: formData.availability_window_start ? new Date(formData.availability_window_start).toISOString() : null,
        availability_window_end: formData.availability_window_end ? new Date(formData.availability_window_end).toISOString() : null,
    };

    if (dataToSubmit.duration_type !== 'limited_frequency') {
        dataToSubmit.duration_details = {};
    } else if (!dataToSubmit.duration_details.notes && dataToSubmit.duration_type === 'limited_frequency') {
        dataToSubmit.duration_details = { notes: '' };
    }

    onSubmit(dataToSubmit);
  };

  const formTitle = initialResourceData ? 'Edit Resource' : 'List a New Resource';
  const forWhom = communityId ? `for Community ID: ${communityId}` : (loggedInUserId ? `by User ID: ${loggedInUserId}` : '');


  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ccc', borderRadius: 2, backgroundColor: 'background.paper' }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 1 }}> {/* Adjusted margin */}
        {formTitle}
      </Typography>
      {forWhom && <Typography variant="caption" color="textSecondary" display="block" sx={{mb:2}}>{forWhom}</Typography>}
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
            label="Quantity"
            name="quantity"
            type="number" // Changed to number
            value={formData.quantity}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            helperText="Enter a numeric value (e.g., 1, 10.5)"
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
          <TextField
            label="Location (Address or General Area)"
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
            helperText="e.g., 34.0522"
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
            helperText="e.g., -118.2437"
          />
        </Grid>

        {/* Tags Input */}
        <Grid item xs={12}> <Typography variant="subtitle1" sx={{mt: 1}}>Tags</Typography> </Grid>
        <Grid item xs={12} sm={8}>
          <TextField label="Add Tag" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} fullWidth variant="outlined" size="small" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button variant="outlined" onClick={handleAddTag} fullWidth sx={{height: '100%'}}>Add Tag</Button>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt:1 }}>
            {formData.tags.map((tag) => (
              <Chip key={tag} label={tag} onDelete={() => handleDeleteTag(tag)} deleteIcon={<DeleteIcon />} />
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
                    <Chip key={constraint.id} label={`${constraint.key}: ${constraint.value.toString()}`} onDelete={() => handleDeleteConstraint(constraint.id)} deleteIcon={<DeleteIcon />} />
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
                    name="duration_details.notes"
                    value={formData.duration_details.notes || ''}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    helperText="e.g., Available first Saturday of each month"
                />
            </Grid>
        )}
         {/* Retained is_recurring as it might be used differently or alongside duration */}
         <Grid item xs={12}>
          <FormControlLabel
            control={<Checkbox checked={formData.is_recurring} onChange={handleChange} name="is_recurring" />}
            label="Is this resource recurring? (Legacy - consider using Duration Type)"
          />
        </Grid>
        {formData.is_recurring && (
          <Grid item xs={12}>
            <TextField label="Recurring Details (Legacy)" name="recurring_details" value={formData.recurring_details} onChange={handleChange} fullWidth multiline rows={2} variant="outlined"/>
          </Grid>
        )}

      </Grid>
      {error && ( // Display error messages
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
          {initialResourceData ? 'Save Changes' : 'List Resource'}
        </Button>
      </Box>
    </Box>
  );
};

export default ResourceListingForm;
