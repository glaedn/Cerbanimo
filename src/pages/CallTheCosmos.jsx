import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import './CallTheCosmos.css';

const CallTheCosmos = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [type, setType] = useState('Material Goods');
  const [submitted, setSubmitted] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState([]);

  const handleSubmit = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/needs`, {
        name,
        description,
        urgency,
        type,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubmitted(true);
      // Mock fetching suggested responses
      setTimeout(() => {
        setSuggestedResponses([
          { text: '“LunaGrow Collective” offers 10 packets 🌱' },
          { text: '“Green Thread” resonates +5 visibility ✧' },
        ]);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit call:", error);
    }
  };

  return (
    <Box className="call-cosmos-container">
      <Typography variant="h4" className="cosmos-title">✦ CALL THE COSMOS ✦</Typography>

      {!submitted ? (
        <Box className="cosmos-form">
          <Typography variant="h6">What do you need?</Typography>
          <TextField
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 50 seed packets for garden"
            className="cosmos-input"
          />
          <TextField
            fullWidth
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your need"
            multiline
            rows={4}
            className="cosmos-input"
          />

          <FormControl fullWidth className="cosmos-select">
            <InputLabel>Urgency</InputLabel>
            <Select value={urgency} label="Urgency" onChange={(e) => setUrgency(e.target.value)}>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth className="cosmos-select">
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
              <MenuItem value="Material Goods">Material Goods</MenuItem>
              <MenuItem value="Expertise">Expertise</MenuItem>
              <MenuItem value="Funding">Funding</MenuItem>
            </Select>
          </FormControl>

          <Button onClick={handleSubmit} className="submit-call-btn">
            [ SUBMIT CALL ]
          </Button>
        </Box>
      ) : (
        <Box className="cosmos-submitted">
          <div className="ripple-container">
            <div className="ripple-animation"></div>
            <div className="ripple-animation"></div>
          </div>
          <Typography variant="h5">Your call has been sent to the cosmos...</Typography>
          <Box className="suggested-responses">
            <Typography>Suggested responses appear as constellations approaching:</Typography>
            <ul>
              {suggestedResponses.map((response, index) => (
                <li key={index}>→ {response.text}</li>
              ))}
            </ul>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CallTheCosmos;