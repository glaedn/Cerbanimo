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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import "./IntentionCreation.css";
import LoadingPopup from '../components/LoadingPopup/LoadingPopup';

const Seed = ({ growth, isBlooming }) => {
  let seedSymbol = '✦';
  let className = 'seed';
  if (isBlooming) {
    className += ' blooming';
    seedSymbol = '🌸';
  } else {
    if (growth > 5) {
      seedSymbol = '🌱';
      className += ' sprout-1';
    }
    if (growth > 20) {
      seedSymbol = '🌿';
      className += ' sprout-2';
    }
    if (growth > 40) {
      seedSymbol = '🌸';
      className += ' sprout-3';
    }
  }
  return <div className={className}>{seedSymbol}</div>;
};

const IntentionCreation = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("Civic");
  const [tags, setTags] = useState([]);
  const [capabilities, setCapabilities] = useState([]);

  const [availableCapabilities, setAvailableCapabilities] = useState([]);
  const [availableTags, setAvailableTags] = useState(['Growth', 'Food', 'Education', 'Art', 'Technology']);
  const [matchingRealms, setMatchingRealms] = useState([]);
  const [isBlooming, setIsBlooming] = useState(false);

  const [loadingPopupOpen, setLoadingPopupOpen] = useState(false);
  const [loadingPopupMessages, setLoadingPopupMessages] = useState([]);

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/profile/options`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAvailableCapabilities(response.data.skillsPool || []);
      } catch (error) {
        console.error("Failed to fetch capabilities:", error);
      }
    };
    fetchCapabilities();
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (name.length > 5) {
      // Mock fetching matching realms
      setMatchingRealms([
        { name: "Soluna", alignment: 0.84 },
        { name: "Gaia Circuit", alignment: 0.69 },
      ]);
    } else {
      setMatchingRealms([]);
    }
  }, [name]);

  const handleCreateIntention = async () => {
    setLoadingPopupMessages(["Declaring your intention..."]);
    setLoadingPopupOpen(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/intentions/create`,
        {
          name: name,
          description: `Archetype: ${archetype}`, // Pass archetype in description
          tags: tags,
          capabilities: capabilities.map(c => typeof c === 'string' ? c : c.name),
          auth0_id: user.sub,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 201) {
        const intentionId = response.data.id;
        setLoadingPopupMessages(prev => [...prev, "Intention declared successfully!"]);
        setLoadingPopupMessages(prev => [...prev, "Auto-generating petals..."]);

        // Auto-generate petals is now default
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/intentions/auto-generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ intentionId }),
        });

        setLoadingPopupMessages(prev => [...prev, "Petals generated!"]);
        navigate(`/lotus-map/${intentionId}`);
      }
    } catch (error) {
      console.error("Failed to create intention:", error);
      setLoadingPopupMessages(["Error creating intention. Please try again."]);
    }
  };

  return (
    <div className="intention-creation-background">
      <LoadingPopup open={loadingPopupOpen} messages={loadingPopupMessages} />
      <Box className="intention-creation-container">
        <Typography variant="h4" className="form-title">
          🌱 DECLARE AN INTENTION 🌱
        </Typography>

        <Seed growth={name.length} isBlooming={isBlooming} />

        <Button onClick={() => {
          setIsBlooming(true);
          setTimeout(() => setIsBlooming(false), 2000); // Reset after animation
        }} className="preview-bloom-button">
          Preview Bloom
        </Button>

        <Typography variant="body1" className="input-label">
          Describe your intention in one line:
        </Typography>
        <TextField
          variant="outlined"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="intention-input"
        />

        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend" className="input-label">Choose archetype:</FormLabel>
          <RadioGroup row value={archetype} onChange={(e) => setArchetype(e.target.value)}>
            <FormControlLabel value="Creative" control={<Radio />} label="Creative" />
            <FormControlLabel value="Civic" control={<Radio />} label="Civic" />
            <FormControlLabel value="Research" control={<Radio />} label="Research" />
          </RadioGroup>
        </FormControl>

        <Autocomplete
          multiple freeSolo options={availableTags} value={tags}
          onChange={(event, newValue) => setTags(newValue)}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Add tags" />
          )}
          className="autocomplete-field"
        />

        <Autocomplete
          multiple freeSolo options={availableCapabilities.map(c => c.name)} value={capabilities}
          onChange={(event, newValue) => setCapabilities(newValue)}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Capability needs" />
          )}
          className="autocomplete-field"
        />

        {matchingRealms.length > 0 && (
          <Box className="matching-realms">
            <Typography variant="h6">Showing matches:</Typography>
            <ul>
              {matchingRealms.map(realm => (
                <li key={realm.name}>→ Realm “{realm.name}” ({realm.alignment} alignment)</li>
              ))}
            </ul>
          </Box>
        )}

        <Button onClick={handleCreateIntention} className="declare-button">
          [ DECLARE INTENTION ✦ ]
        </Button>
      </Box>
    </div>
  );
};

export default IntentionCreation;