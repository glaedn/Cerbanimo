import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Autocomplete,
  Chip,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  blue,
  red,
  green,
  orange,
  purple,
  teal,
  pink,
  indigo,
} from "@mui/material/colors";
import "./IntentionCreation.css";
import LoadingPopup from '../components/LoadingPopup/LoadingPopup';
import theme from '../styles/theme';

const IntentionCreation = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(true);
  const [loadingPopupOpen, setLoadingPopupOpen] = useState(false);
  const [loadingPopupMessages, setLoadingPopupMessages] = useState([]);

  const colorPalette = [
    blue[100],
    red[100],
    green[100],
    orange[100],
    purple[100],
    teal[100],
    pink[100],
    indigo[100],
    blue[200],
    red[200],
    green[200],
    orange[200],
    purple[200],
    teal[200],
    pink[200],
    indigo[200],
  ];

  const getRandomColorFromPalette = () => {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

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

  const handleCreateIntention = async () => {
    setLoadingPopupMessages([`Creating your ${theme.terminology.project}...`]);
    setLoadingPopupOpen(true);
    try {
      const token = await getAccessTokenSilently();

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/projects/create`,
        {
          name: name,
          description: description,
          tags: selectedTags,
          auth0_id: user.sub,
        },
        {
          headers: {
        Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        const projectId = response.data.id;
        setLoadingPopupMessages(prevMessages => [...prevMessages, `${theme.terminology.project} created successfully!`]);

        if (autoGenerateTasks) {
          setLoadingPopupMessages(prevMessages => [...prevMessages, `Generating ${theme.terminology.task_plural} data...`]);
          const generateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/projects/auto-generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ projectId }),

          });
          const result = await generateResponse.json();

          if (result.success) {
            setLoadingPopupMessages(prevMessages => [...prevMessages, `${theme.terminology.task_plural} generated successfully!`]);
          } else {
            setLoadingPopupMessages(prevMessages => [...prevMessages, `${theme.terminology.task} generation failed: ` + result.error]);
          }
        }

        navigate(`/visualizer/${projectId}`);
      }
    } catch (error) {
      console.error(`Failed to create ${theme.terminology.project}:`, error);
      setLoadingPopupMessages([`Error creating ${theme.terminology.project}. Please try again.`]);
      setLoadingPopupOpen(true);
    }
  };

  return (
    <div className="project-creation-background">
    <LoadingPopup open={loadingPopupOpen} messages={loadingPopupMessages} />
    <Box className="project-creation-container" sx={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" className="form-title">
        {theme.terminology.create_project}
      </Typography>
      <TextField
        label={`${theme.terminology.project} Name`}
        variant="outlined"
        sx={{ width: '100%' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
      />
      <TextField
        label={`${theme.terminology.project} Description`}
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
      />
      <Autocomplete
        multiple
        options={availableTags}
        getOptionLabel={(option) => option.name}
        value={selectedTags}
        onChange={(event, newValue) => setSelectedTags(newValue)}
        freeSolo
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
            return (
              <Chip
                key={key}
                label={option.name}
                {...otherProps}
                sx={{ margin: '2px' }}
              />
            );
          })
        }
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={autoGenerateTasks}
            onChange={(e) => setAutoGenerateTasks(e.target.checked)}
            color="primary"
          />
        }
        label={`Auto-generate ${theme.terminology.project} ${theme.terminology.task_plural} using AI`}
        sx={{ marginTop: 2, marginBottom: 1 }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleCreateIntention}
        sx={{ marginTop: 2, paddingY: '10px', paddingX: '20px', fontWeight: 'bold' }}
      >
        {theme.terminology.create_project}
      </Button>
    </Box>
    </div>
  );
};

export default IntentionCreation;
