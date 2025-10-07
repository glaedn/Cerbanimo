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

const IntentionCreation = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableCapabilities, setAvailableCapabilities] = useState([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState([]);
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
    const fetchCapabilities = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/profile/options`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setAvailableCapabilities(response.data.skillsPool || []);
      } catch (error) {
        console.error("Failed to fetch capabilities:", error);
      }
    };
    fetchCapabilities();
  }, [getAccessTokenSilently]);

  const handleCreateIntention = async () => {
    setLoadingPopupMessages(["Declaring your intention..."]);
    setLoadingPopupOpen(true);
    try {
      const token = await getAccessTokenSilently();

      // Step 1: Create the intention

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/intentions/create`,
        {
          name: name,
          description: description,
          tags: [], // Tags are deprecated for now, send empty array
          capabilities: selectedCapabilities.map(c => c.name),
          auth0_id: user.sub,
        },
        {
          headers: {
        Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        const intentionId = response.data.id;
        setLoadingPopupMessages(prevMessages => [...prevMessages, "Intention declared successfully!"]);

        if (autoGenerateTasks) {
          setLoadingPopupMessages(prevMessages => [...prevMessages, "Generating task data..."]);
          // Step 2: Auto-generate tasks using LLM
          const generateResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/intentions/auto-generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ intentionId }), // Send the new intention ID

          });
          const result = await generateResponse.json();

          if (result.success) {
            setLoadingPopupMessages(prevMessages => [...prevMessages, "Tasks generated successfully!"]);
          } else {
            setLoadingPopupMessages(prevMessages => [...prevMessages, "Task generation failed: " + result.error]);
          }
        }

        // Step 3: Navigate to the intention visualizer either way
        navigate(`/lotus-map/${intentionId}`);
      }
    } catch (error) {
      console.error("Failed to create intention:", error);
      setLoadingPopupMessages(["Error creating intention. Please try again."]);
      setLoadingPopupOpen(true); // Ensure it's open if it wasn't already
    }
  };

  return (
    <div className="intention-creation-background">
    <LoadingPopup open={loadingPopupOpen} messages={loadingPopupMessages} />
    <Box className="intention-creation-container" sx={{ maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" className="form-title">
        Declare an Intention
      </Typography>
      <TextField
        label="Intention Name"
        variant="outlined"
        sx={{ width: '100%' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
      />
      <TextField
        label="Intention Description"
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
        options={availableCapabilities}
        getOptionLabel={(option) => option.name}
        value={selectedCapabilities}
        onChange={(event, newValue) => setSelectedCapabilities(newValue)}
        freeSolo
        sx={{ width: '100%' }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="Capability Needs"
            placeholder="Add capabilities"
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
        label="Auto-generate intention tasks using AI"
        sx={{ marginTop: 2, marginBottom: 1 }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleCreateIntention}
        sx={{ marginTop: 2, paddingY: '10px', paddingX: '20px', fontWeight: 'bold' }}
      >
        Declare Intention
      </Button>
    </Box>
    </div>
  );
};

export default IntentionCreation;