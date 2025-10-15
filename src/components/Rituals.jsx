import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, TextField, Button, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

const Rituals = ({ realmId }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [rituals, setRituals] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));

  const fetchRituals = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/rituals`, {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRituals(response.data);
    } catch (error) {
      console.error('Error fetching rituals:', error);
    }
  };

  useEffect(() => {
    if (realmId) {
      fetchRituals();
    }
  }, [realmId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/realms/${realmId}/rituals`,
        { title, description, start_time: startTime },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTitle('');
      setDescription('');
      setStartTime(new Date().toISOString().slice(0, 16));
      fetchRituals(); // Refresh the list
    } catch (error) {
      console.error('Error creating ritual:', error);
    }
  };

  return (
    <Box className="rituals-container" sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>Rituals</Typography>

      <Paper elevation={2} sx={{ padding: 2, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>Schedule a New Group Manifestation</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
          />
          <TextField
            label="Start Time"
            type="datetime-local"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            margin="normal"
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
          <Button type="submit" variant="contained" color="primary" sx={{ marginTop: 2 }}>
            Schedule Ritual
          </Button>
        </form>
      </Paper>

      <Typography variant="h6" gutterBottom>Scheduled Rituals</Typography>
      <List>
        {rituals.length > 0 ? (
          rituals.map((ritual) => (
            <ListItem
              key={ritual.id}
              component={Link}
              to={`/manifestation-session/${ritual.id}`}
              button
            >
              <ListItemText
                primary={ritual.title}
                secondary={`Scheduled for: ${new Date(ritual.start_time).toLocaleString()}`}
              />
            </ListItem>
          ))
        ) : (
          <Typography>No rituals scheduled for this realm yet.</Typography>
        )}
      </List>
    </Box>
  );
};

export default Rituals;