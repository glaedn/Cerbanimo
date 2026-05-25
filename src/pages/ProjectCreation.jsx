import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation as useRouteLocation } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Autocomplete,
  Chip,
  FormControlLabel,
  Checkbox,
  createFilterOptions,
  Grid,
  CircularProgress
} from "@mui/material";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import "./ProjectCreation.css";
import LoadingPopup from '../components/LoadingPopup/LoadingPopup';

const ProjectCreation = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const routeLocation = useRouteLocation();

  const isServiceRequest = useMemo(() => {
    const params = new URLSearchParams(routeLocation.search);
    return params.get('isService') === 'true';
  }, [routeLocation.search]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [servicePrice, setServicePrice] = useState(0);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [dueDate, setDueDate] = useState(null);
  const [location, setLocation] = useState({ text: '', latitude: null, longitude: null });
  const [locationSearch, setLocationSearch] = useState('');
  const [locationOptions, setLocationOptions] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [autoGeneratePlan, setAutoGeneratePlan] = useState(true);
  const [autoAssign, setAutoAssign] = useState(false);
  const [loadingPopupOpen, setLoadingPopupOpen] = useState(false);
  const [loadingPopupMessages, setLoadingPopupMessages] = useState([]);

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
    const fetchTags = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/profile/options`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailableTags(response.data.interestsPool);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, [getAccessTokenSilently]);

  const handleLocationSelect = (event, newValue) => {
    if (newValue) {
      setLocation({
        text: newValue.displayName || '',
        latitude: newValue.latitude,
        longitude: newValue.longitude
      });
    } else {
      setLocation({ text: '', latitude: null, longitude: null });
    }
  };

  const handleCreateProject = async () => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    setLoadingPopupMessages(["Creating your project..."]);
    setLoadingPopupOpen(true);
    try {
      const token = await getAccessTokenSilently();

      // Step 1: Create the project

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/projects/create`,
        {
          name: name,
          description: description,
          tags: selectedTags,
          auth0_id: user.sub,
          outcomeStatement: outcome,
          due_date: dueDate ? dueDate.toISOString() : null,
          location: location.text ? location : null,
          auto_assign: autoAssign,
          is_service: isServiceRequest,
          service_visibility: isServiceRequest ? ['profile', 'marketplace'] : ['private'],
          service_price: servicePrice
        },
        {
          headers: {
        Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        const projectId = response.data.id;
        setLoadingPopupMessages(prevMessages => [...prevMessages, "Project created successfully!"]);

        if (autoGeneratePlan) {
          setLoadingPopupMessages(prevMessages => [...prevMessages, "Generating task data..."]);
          // Step 2: Auto-generate tasks using LLM
          const generateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/projects/auto-generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ projectId }), // Send the new project ID

          });
          const result = await generateResponse.json();

          if (result.success) {
          if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
            setLoadingPopupMessages(prevMessages => [...prevMessages, "Tasks generated successfully!"]);
          } else {
            setLoadingPopupMessages(prevMessages => [...prevMessages, "Task generation failed: " + result.error]);
          }
        }

        // Step 3: Navigate to the project visualizer either way
        navigate(`/visualizer/${projectId}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      setLoadingPopupMessages(["Error creating project. Please try again."]);
      setLoadingPopupOpen(true); // Ensure it's open if it wasn't already
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <div className="project-creation-background">
    <LoadingPopup open={loadingPopupOpen} messages={loadingPopupMessages} />
    <Box className="project-creation-container" sx={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '16px' : '20px',
      paddingTop: isMobile ? '40px' : '80px',
      pb: isMobile ? '100px' : '20px'
    }}>
      <Typography variant={isMobile ? "h5" : "h4"} className="form-title" sx={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }}>
        Create a New Project
      </Typography>
      <TextField
        label="Project Name"
        variant="outlined"
        sx={{ width: '100%' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
      />
      <TextField
        label="Project Description"
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
      />
      <TextField
        label="Intended Outcome (Real-world effect)"
        variant="outlined"
        fullWidth
        multiline
        rows={2}
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        placeholder="e.g. Reduce food waste in the local neighborhood by 20%"
        margin="normal"
      />
      {isServiceRequest && (
        <TextField
          label="Service Price (Galactic Credits)"
          variant="outlined"
          fullWidth
          type="number"
          value={servicePrice}
          onChange={(e) => setServicePrice(e.target.value)}
          margin="normal"
          helperText="Enter the price for this service listing."
        />
      )}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Autocomplete
            fullWidth
            options={locationOptions}
            getOptionLabel={(option) => option.displayName || ''}
            loading={isGeocoding}
            onInputChange={(event, newInputValue) => setLocationSearch(newInputValue)}
            onChange={handleLocationSelect}
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
      </Grid>
      <DatePicker
        label="Target Completion Date (Optional)"
        value={dueDate}
        onChange={(newValue) => setDueDate(newValue)}
        minDate={dayjs()}
        slotProps={{
          textField: {
            fullWidth: true,
            margin: "normal",
            variant: "outlined",
            helperText: "Setting a deadline helps AI distribute tasks effectively."
          }
        }}
      />
      <Autocomplete
        multiple
        options={availableTags}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          if (option.inputValue) return option.inputValue;
          return option.name || '';
        }}
        value={selectedTags}
        filterOptions={(options, params) => {
          const filter = createFilterOptions();
          const filtered = filter(options, params);
          const { inputValue } = params;
          const isExisting = options.some((option) => inputValue.toLowerCase() === option.name.toLowerCase());
          if (inputValue !== '' && !isExisting) {
            filtered.push({
              inputValue,
              name: `+ Create Custom Interest: "${inputValue}"`,
            });
          }
          return filtered;
        }}
        onChange={(event, newValue) => {
          const processedValue = newValue.map(item => {
            if (typeof item === 'string') return { name: item };
            if (item.inputValue) return { name: item.inputValue };
            return item;
          });
          setSelectedTags(processedValue);
        }}
        freeSolo
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        sx={{ width: '100%' }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Tags"
            placeholder="Add tags"
            margin="normal"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...otherProps } = getTagProps({ index });
            const item = typeof option === 'string' ? { name: option } : option;
            return (
              <Chip
                key={key}
                label={item.name}
                {...otherProps}
                sx={{ margin: '2px' }}
              />
            );
          })
        }
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={autoGeneratePlan}
              onChange={(e) => setAutoGeneratePlan(e.target.checked)}
              color="primary"
            />
          }
          label="Auto-generate project tasks using AI"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              color="secondary"
            />
          }
          label="Auto-notify users when tasks activate"
        />
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={handleCreateProject}
        fullWidth={isMobile}
        sx={{
          marginTop: 2,
          paddingY: '12px',
          paddingX: '20px',
          fontWeight: 'bold',
          height: isMobile ? '56px' : 'auto',
          fontSize: isMobile ? '1.1rem' : '1rem'
        }}
      >
        Create Project
      </Button>
    </Box>
    </div>
    </LocalizationProvider>
  );
};

export default ProjectCreation;
