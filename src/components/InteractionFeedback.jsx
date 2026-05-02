import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Rating, Stack } from '@mui/material';
import theme from '../styles/theme';

const InteractionFeedback = ({ needId, taskId, onSubmit, onCancel }) => {
  const [isSafe, setIsSafe] = useState(true);
  const [isFulfilled, setIsFulfilled] = useState(true);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    onSubmit({
      needId,
      taskId,
      isSafe,
      isFulfilled,
      comment
    });
  };

  return (
    <Box sx={{
      p: 3,
      bgcolor: 'rgba(10, 10, 46, 0.9)',
      border: `1px solid ${theme.colors.primary}`,
      borderRadius: theme.borders.borderRadiusMd,
      color: theme.colors.textPrimary,
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <Typography variant="h6" sx={{ color: theme.colors.primary, fontFamily: 'Orbitron', mb: 2 }}>
        Interaction Feedback
      </Typography>

      <Typography variant="body2" sx={{ mb: 1 }}>Was this interaction safe?</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant={isSafe ? "contained" : "outlined"}
          onClick={() => setIsSafe(true)}
          sx={{ borderColor: theme.colors.primary, color: isSafe ? '#000' : theme.colors.primary }}
        >
          Yes
        </Button>
        <Button
          variant={!isSafe ? "contained" : "outlined"}
          onClick={() => setIsSafe(false)}
          color="error"
        >
          No
        </Button>
      </Stack>

      <Typography variant="body2" sx={{ mb: 1 }}>Was the need fulfilled?</Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant={isFulfilled ? "contained" : "outlined"}
          onClick={() => setIsFulfilled(true)}
          sx={{ borderColor: theme.colors.primary, color: isFulfilled ? '#000' : theme.colors.primary }}
        >
          Yes
        </Button>
        <Button
          variant={!isFulfilled ? "contained" : "outlined"}
          onClick={() => setIsFulfilled(false)}
          sx={{ borderColor: theme.colors.secondary, color: !isFulfilled ? '#000' : theme.colors.secondary }}
        >
          No
        </Button>
      </Stack>

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Additional Comments"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={{
          mb: 3,
          '& .MuiInputLabel-root': { color: theme.colors.textSecondary },
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': { borderColor: theme.colors.border },
            '&:hover fieldset': { borderColor: theme.colors.primary },
          }
        }}
      />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onCancel} sx={{ color: theme.colors.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: theme.colors.primary, color: '#000' }}>
          Submit Feedback
        </Button>
      </Stack>
    </Box>
  );
};

export default InteractionFeedback;
