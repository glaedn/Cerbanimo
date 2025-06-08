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
import "./ProjectCreation.css";

const ProjectCreation = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(true);

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
        alert("Project created successfully!");

        if (autoGenerateTasks) {
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
            alert("Tasks generated successfully!");
          } else {
            alert("Task generation failed: " + result.error);
          }
        }

        // Step 3: Navigate to the project visualizer either way
        navigate(`/visualizer/${projectId}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Error creating project. Please try again.");
    }
  };

  return (
    <div className="project-creation-background">
    <Box className="project-creation-container" sx={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" className="form-title">
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
        sx={{ marginTop: 2, paddingY: '10px', paddingX: '20px', fontWeight: 'bold' }}
      >
        Create Project
      </Button>
    </Box>
    </div>
  );
};

export default ProjectCreation;
