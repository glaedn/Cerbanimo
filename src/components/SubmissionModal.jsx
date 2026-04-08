import React, { useState } from 'react';
import {
  Modal, Paper, Typography, TextField, Button, Box, IconButton, List, ListItem, ListItemText, Divider, Snackbar, Alert, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion, AnimatePresence } from 'framer-motion';

const SubmissionModal = ({ open, onClose, onSubmit, taskName }) => {
  const [proofUrls, setProofUrls] = useState(['']);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUrl = () => {
    setProofUrls([...proofUrls, '']);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...proofUrls];
    newUrls[index] = value;
    setProofUrls(newUrls);
  };

  const handleRemoveUrl = (index) => {
    const newUrls = [...proofUrls];
    newUrls.splice(index, 1);
    setProofUrls(newUrls);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // filter out empty URLs
    const filteredUrls = proofUrls.filter(url => url.trim() !== '');
    try {
        await onSubmit({ proofUrls: filteredUrls, notes });
        onClose();
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="submission-modal-title" closeAfterTransition>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            <Paper sx={{
              width: { xs: '90%', sm: '450px' },
              maxHeight: '90vh',
              overflowY: 'auto',
              bgcolor: 'rgba(28, 28, 30, 0.95)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              boxShadow: '0 0 40px rgba(0, 243, 255, 0.5)',
              p: 3,
              borderRadius: '16px',
              border: '1px solid #00F3FF',
              position: 'relative'
            }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" id="submission-modal-title" sx={{ color: '#00F3FF' }}>
            Submit Task: {taskName}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
          Provide proof of completion (URLs, links to artifacts, etc.)
        </Typography>

        <List sx={{ mb: 2 }}>
          {proofUrls.map((url, index) => (
            <ListItem key={index} disablePadding sx={{ mb: 1 }}>
              <TextField
                fullWidth
                label={`Proof URL #${index + 1}`}
                variant="outlined"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: '#00F3FF' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }
                }}
              />
              <IconButton onClick={() => handleRemoveUrl(index)} disabled={proofUrls.length === 1} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>

        <Button
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddUrl}
          sx={{ color: '#00F3FF', mb: 3 }}
        >
          Add Another URL
        </Button>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Additional Notes"
          variant="outlined"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: '#00F3FF' },
            },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }
          }}
        />

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{
                  backgroundColor: '#00F3FF',
                  color: '#000',
                  fontWeight: 'bold',
                  height: '56px',
                  fontSize: '1.1rem',
                  '&:hover': { backgroundColor: '#4DABF7' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(0, 243, 255, 0.2)', color: 'rgba(255,255,255,0.3)' }
                }}
              >
                {isSubmitting ? (
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={24} color="inherit" />
                    LAUNCHING...
                  </Box>
                ) : 'SUBMIT MISSION'}
              </Button>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default SubmissionModal;
