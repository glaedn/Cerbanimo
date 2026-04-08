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
import { useIsMobile } from "../hooks/useIsMobile";
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
import "./ProjectCreation.css";
import LoadingPopup from '../components/LoadingPopup/LoadingPopup';

const ProjectCreation = () => {
  const isMobile = useIsMobile();
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
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

        // Step 1.5: Create Outcome node
        if (outcome) {
          try {
            await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/impact_v2/outcomes`,
              { projectId, statement: outcome },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (outcomeError) {
            console.error("Failed to create outcome:", outcomeError);
          }
        }

        if (autoGenerateTasks) {
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
        label="Auto-generate project tasks using AI"
        sx={{ marginTop: 2, marginBottom: 1 }}
      />
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
  );
};

export default ProjectCreation;
