import React, { useState } from 'react';
import { Card, CardContent, Typography, Chip, Button, Box, Divider, Snackbar, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { motion, AnimatePresence } from 'framer-motion';

const MobileTaskCard = ({ task, onAccept }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleView = () => {
    navigate(`/Visualizer/${task.project_id}/${task.id}`);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card sx={{
        mb: 2,
        backgroundColor: 'rgba(28, 28, 30, 0.9)',
        border: '1px solid rgba(0, 243, 255, 0.3)',
        borderRadius: '8px',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Decorative HUD Scanline */}
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #00F3FF, transparent)',
          opacity: 0.5,
          animation: 'scanline-anim 3s linear infinite'
        }} />

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
                if (window.navigator.vibrate) window.navigator.vibrate(50);
                await onAccept(task.id);
                setLoading(false);
                setSuccess(true);
                if (window.navigator.vibrate) window.navigator.vibrate([30, 30, 30]);
                setSnackbar({ open: true, message: 'Mission accepted!', severity: 'success' });
                setTimeout(() => setSuccess(false), 2000);
              }}
              sx={{
                backgroundColor: success ? '#00ff64' : '#00F3FF',
                color: '#000',
                transition: 'all 0.3s ease',
                '&:hover': { backgroundColor: success ? '#00ff64' : '#00e5f2' }
              }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CircularProgress size={20} color="inherit" />
                  </motion.div>
                ) : success ? (
                  <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1.2 }} exit={{ scale: 0 }}>
                    <CheckCircleOutlineIcon />
                  </motion.div>
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '0.7rem' }}>
                    INITIALIZE MISSION
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          )}
          <Button
            variant="outlined"
            fullWidth
            size="small"
            onClick={handleView}
            sx={{ borderColor: '#00F3FF', color: '#00F3FF', fontSize: '0.7rem' }}
          >
            VIEW PROJECT
          </Button>
        </Box>
        </CardContent>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: '8px', border: '1px solid rgba(0,243,255,0.5)' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        <style>{`
          @keyframes scanline-anim {
            0% { transform: translateY(-20px); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(200px); opacity: 0; }
          }
        `}</style>
      </Card>
    </motion.div>
  );
};

export default React.memo(MobileTaskCard);
