import React, { useState } from 'react';
import { Card, CardContent, Typography, Chip, Button, Box, Divider, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const MobileTaskCard = ({ task, onAccept }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleView = () => {
    navigate(`/visualizer/${task.project_id}/${task.id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'info';
      case 'in_progress': return 'warning';
      case 'submitted': return 'secondary';
      case 'approved': return 'success';
      default: return 'default';
    }
  };

  return (
    <Card sx={{
      mb: 2,
      backgroundColor: 'rgba(28, 28, 30, 0.9)',
      border: '1px solid rgba(0, 243, 255, 0.3)',
      borderRadius: '8px',
      color: '#fff'
    }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00F3FF', fontWeight: 'bold' }}>
          {task.name}
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            {task.skill_type || 'General'} | Lvl {task.level || 1}
          </Typography>
          <Chip
            label={task.status || 'available'}
            size="small"
            color={getStatusColor(task.status)}
            sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
          />
        </Box>
        <Divider sx={{ my: 1.5, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <Box display="flex" gap={2}>
          {task.status === 'available' && (
            <Button
              variant="contained"
              fullWidth
              size="small"
              disabled={loading || success}
              onClick={async () => {
                setLoading(true);
                await onAccept(task.id);
                setLoading(false);
                setSuccess(true);
                setSnackbar({ open: true, message: 'Mission accepted!', severity: 'success' });
                setTimeout(() => setSuccess(false), 2000);
              }}
              sx={{
                backgroundColor: success ? '#00ff64' : '#00F3FF',
                color: '#000',
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : (success ? <CheckCircleOutlineIcon /> : 'Accept')}
            </Button>
          )}
          <Button
            variant="outlined"
            fullWidth
            size="small"
            onClick={handleView}
            sx={{ borderColor: '#00F3FF', color: '#00F3FF' }}
          >
            View
          </Button>
        </Box>
      </CardContent>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Card>
  );
};

export default React.memo(MobileTaskCard);
