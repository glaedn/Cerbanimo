import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, Chip, Divider, List, ListItem, ListItemText, CircularProgress, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import SubmissionModal from '../components/SubmissionModal';

const MobileTaskDetail = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTask(response.data);
      } catch (err) {
        console.error('Error fetching task:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId, getAccessTokenSilently]);

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      const token = await getAccessTokenSilently();
      let res;
      if (action === 'accept') {
        res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/accept`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeedback({ open: true, message: 'Mission accepted!', severity: 'success' });
      } else if (action === 'drop') {
        res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/drop`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeedback({ open: true, message: 'Mission dropped.', severity: 'info' });
      }

      // Re-fetch task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch (err) {
        setFeedback({ open: true, message: `Failed to ${action} mission.`, severity: 'error' });
    } finally {
        setActionLoading(false);
    }
  };

  const handleSubmission = async (submissionData) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/submit`, submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedback({ open: true, message: 'Mission submitted for review!', severity: 'success' });

      // Re-fetch task
      const updatedTaskRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(updatedTaskRes.data);
    } catch (err) {
        setFeedback({ open: true, message: 'Submission failed.', severity: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (!task) return <Box sx={{ p: 4 }}><Typography color="error">Mission not found.</Typography></Box>;

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#00F3FF' }}>
          Back
        </Button>
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ color: '#00F3FF', fontWeight: 'bold', mb: 1 }}>
          {task.name}
        </Typography>

        <Box display="flex" gap={1} mb={2}>
          <Chip label={task.skill_type || 'General'} size="small" sx={{ bgcolor: 'rgba(0, 243, 255, 0.1)', color: '#00F3FF' }} />
          <Chip label={`Lvl ${task.level || 1}`} size="small" sx={{ bgcolor: 'rgba(255, 92, 162, 0.1)', color: '#FF5CA2' }} />
          <Chip label={task.status} size="small" color="info" />
        </Box>

        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(28, 28, 30, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#00F3FF', mb: 1 }}>Mission Description</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            {task.description}
          </Typography>
        </Paper>

        <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

        <Typography variant="subtitle2" sx={{ color: '#00F3FF', mb: 1 }}>Requirements & Rewards</Typography>
        <List dense>
          <ListItem sx={{ px: 0 }}>
             <ListItemText primary="Reward Tokens" secondary={`${task.reward_tokens || 0} coTokens`} primaryTypographyProps={{ color: '#fff' }} />
          </ListItem>
          <ListItem sx={{ px: 0 }}>
             <ListItemText primary="Review Quorum" secondary="2 Peer Reviews required" primaryTypographyProps={{ color: '#fff' }} />
          </ListItem>
        </List>
      </Box>

      {/* Sticky Bottom Actions */}
      <Paper sx={{ position: 'fixed', bottom: 65, left: 0, right: 0, p: 2, backgroundColor: 'rgba(10, 10, 46, 0.95)', borderTop: '1px solid #00F3FF', zIndex: 1000 }} elevation={10}>
        <Box display="flex" gap={2}>
          {task.status === 'available' || task.status === 'active-unassigned' ? (
            <Button
                variant="contained"
                fullWidth
                onClick={() => handleAction('accept')}
                disabled={actionLoading}
                sx={{ bgcolor: '#00F3FF', color: '#000', fontWeight: 'bold' }}
            >
              {actionLoading ? <CircularProgress size={24} color="inherit" /> : 'Accept Mission'}
            </Button>
          ) : task.status === 'active-assigned' || task.status === 'in_progress' ? (
            <>
              <Button variant="contained" fullWidth onClick={() => setIsSubmissionModalOpen(true)} sx={{ bgcolor: '#00F3FF', color: '#000', fontWeight: 'bold' }}>
                Submit Mission
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleAction('drop')}
                disabled={actionLoading}
                sx={{ color: '#FF4136', borderColor: '#FF4136' }}
              >
                {actionLoading ? <CircularProgress size={24} color="inherit" /> : 'Drop Mission'}
              </Button>
            </>
          ) : (
            <Button variant="contained" fullWidth disabled sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              {task.status.toUpperCase()}
            </Button>
          )}
        </Box>
      </Paper>

      <SubmissionModal
        open={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSubmit={handleSubmission}
        taskName={task.name}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={6000}
        onClose={() => setFeedback({ ...feedback, open: false })}
      >
        <Alert severity={feedback.severity} variant="filled">
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileTaskDetail;
