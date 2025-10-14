import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import './ManifestationSession.css';

const ManifestationSession = () => {
    const { sessionId } = useParams();
    const { getAccessTokenSilently } = useAuth0();
    const [session, setSession] = useState(null);
    const [timer, setTimer] = useState(1800); // 30 minutes in seconds
    const [summary, setSummary] = useState('');

    useEffect(() => {
        const fetchSession = async () => {
            if (sessionId) {
                try {
                    const token = await getAccessTokenSilently();
                    const response = await axios.get(
                        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${sessionId}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        }
                    );
                    setSession(response.data);
                } catch (error) {
                    console.error('Error fetching session:', error);
                }
            }
        };

        fetchSession();
    }, [sessionId, getAccessTokenSilently]);

  useEffect(() => {
    if (session && session.status === 'active' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      handleEndSession();
    }
  }, [session, timer]);

  const handleEndSession = async () => {
    if (!session) return;
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/manifestation-sessions/${session.id}/end`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSummary(response.data.manifestation_summary);
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (!session) {
    return <div>Loading session...</div>;
  }

    return (
        <Box className="manifestation-session-container" sx={{ padding: 3 }}>
            <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="h4" gutterBottom>🌠 {session.title || 'Group Manifestation'} 🌠</Typography>
                <Typography variant="body1" gutterBottom>{session.description}</Typography>
                <Box className="session-stats" sx={{ display: 'flex', justifyContent: 'space-around', marginBottom: 2 }}>
                    <Typography>Timer: {formatTime(timer)}</Typography>
                    <Typography>Participants: {session.participants?.length || 0}</Typography>
                    <Typography>Active Resonances: {session.resonance_events?.length || 0}</Typography>
                </Box>
            </Paper>

            <Box className="live-constellation" sx={{
                height: '500px',
                border: '1px solid #ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 2
            }}>
                <Typography>Live Constellation View (Placeholder)</Typography>
            </Box>

            <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
                <Typography variant="h6">Participants</Typography>
                <List>
                    {/* Placeholder for participant list */}
                </List>
            </Paper>

            {summary && (
                <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
                    <Typography variant="h5">Manifestation Summary</Typography>
                    <Typography>{summary}</Typography>
                </Paper>
            )}
             <div className="session-controls">
                <button onClick={handleEndSession} disabled={session.status === 'completed'}>
                    [ END SESSION ]
                </button>
            </div>
        </Box>
    );
};

export default ManifestationSession;