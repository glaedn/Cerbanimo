import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Autocomplete,
  Chip,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';

const ProjectSettingsModal = ({ open, onClose, project, onSave, interestsPool }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [],
    due_date: null
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        tags: project.tags || [],
        due_date: project.due_date ? dayjs(project.due_date) : null
      });
    }
  }, [project, open]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: '#0a0a1e',
          color: '#00f3ff',
          border: '1px solid #00f3ff',
          boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
          fontFamily: 'Orbitron, sans-serif'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Orbitron', fontWeight: 'bold' }}>
          PROJECT_SETTINGS
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#00f3ff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(0, 243, 255, 0.2)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          <TextField
            label="PROJECT_NAME"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                '&:hover fieldset': { borderColor: '#00f3ff' },
                '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(0, 243, 255, 0.7)' }
            }}
          />
          <TextField
            label="DESCRIPTION"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                '&:hover fieldset': { borderColor: '#00f3ff' },
                '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(0, 243, 255, 0.7)' }
            }}
          />
          <Autocomplete
            multiple
            freeSolo
            options={interestsPool || []}
            value={formData.tags}
            onChange={(event, newValue) => {
              setFormData({ ...formData, tags: newValue });
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={index}
                  label={option}
                  sx={{
                    bgcolor: 'rgba(0, 243, 255, 0.1)',
                    color: '#00f3ff',
                    border: '1px solid #00f3ff',
                    fontFamily: 'Orbitron',
                    fontSize: '0.7rem'
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="PROJECT_TAGS"
                variant="outlined"
                placeholder="Add tags..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: '#00f3ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(0, 243, 255, 0.7)' }
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-popupIndicator': { color: '#00f3ff' },
              '& .MuiAutocomplete-clearIndicator': { color: '#00f3ff' },
            }}
          />
          <DatePicker
            label="TARGET_COMPLETION_DATE"
            value={formData.due_date}
            onChange={(newValue) => setFormData({ ...formData, due_date: newValue })}
            minDate={dayjs()}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: "outlined",
                sx: {
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(0, 243, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: '#00f3ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00f3ff' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(0, 243, 255, 0.7)' },
                  '& .MuiSvgIcon-root': { color: '#00f3ff' }
                }
              }
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#ff5ca2',
            fontFamily: 'Orbitron',
            '&:hover': { bgcolor: 'rgba(255, 92, 162, 0.1)' }
          }}
        >
          ABORT
        </Button>
        <Button
          onClick={handleSave}
          variant="outlined"
          sx={{
            color: '#00f3ff',
            borderColor: '#00f3ff',
            fontFamily: 'Orbitron',
            '&:hover': {
              bgcolor: 'rgba(0, 243, 255, 0.1)',
              borderColor: '#00f3ff'
            }
          }}
        >
          UPLOAD_CHANGES
        </Button>
      </DialogActions>
    </Dialog>
    </LocalizationProvider>
  );
};

export default ProjectSettingsModal;
