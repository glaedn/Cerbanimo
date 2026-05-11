import React, { useState } from 'react';
import { Box, Typography, Slider, IconButton, Stack } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';

const NarrativePlayback = ({ events = [] }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const defaultEvents = [
    { time: 'T-0', label: 'Initial Signal', detail: 'Flood warning issued for North Syracuse.' },
    { time: 'T+2h', label: 'Mobilization', detail: '4 communities activated mutual aid protocols.' },
    { time: 'T+12h', label: 'Coordination', detail: 'Logistics hub established at Community Center.' },
    { time: 'T+48h', label: 'Stabilization', detail: 'Needs fulfilled for 90% of affected households.' },
    { time: 'T+1w', label: 'Reflection', detail: 'Post-crisis trust index increased by 15%.' }
  ];

  const hasData = events && events.length > 0;
  const displayEvents = hasData ? events : defaultEvents;

  return (
    <Box sx={{ p: 3, bgcolor: 'rgba(10, 10, 46, 0.8)', borderRadius: 2, border: '1px solid rgba(0, 243, 255, 0.3)' }}>
      <Typography variant="overline" sx={{ color: '#00f3ff', letterSpacing: 2, mb: 3, display: 'block' }}>
        CIVIC_MEMORY_PLAYBACK {!hasData && '(DEMO_MODE)'}
      </Typography>

      <Box sx={{ minHeight: '120px', mb: 4, p: 2, bgcolor: 'rgba(0, 243, 255, 0.05)', borderRadius: 1, borderLeft: '4px solid #00f3ff' }}>
        <Typography variant="caption" sx={{ color: '#00f3ff', fontWeight: 'bold' }}>
          {displayEvents[activeStep].time} - {displayEvents[activeStep].label.toUpperCase()}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: '#fff', fontStyle: 'italic' }}>
          "{displayEvents[activeStep].detail}"
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <IconButton size="small" onClick={() => setActiveStep(prev => Math.max(0, prev - 1))} sx={{ color: '#00f3ff' }}>
          <SkipPreviousIcon />
        </IconButton>
        <IconButton onClick={() => setIsPlaying(!isPlaying)} sx={{ color: '#00f3ff', border: '1px solid #00f3ff' }}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton size="small" onClick={() => setActiveStep(prev => Math.min(displayEvents.length - 1, prev + 1))} sx={{ color: '#00f3ff' }}>
          <SkipNextIcon />
        </IconButton>

        <Slider
          value={activeStep}
          max={displayEvents.length - 1}
          onChange={(_, val) => setActiveStep(val)}
          sx={{
            color: '#00f3ff',
            '& .MuiSlider-thumb': {
              boxShadow: '0 0 10px #00f3ff'
            }
          }}
        />
      </Stack>
    </Box>
  );
};

export default NarrativePlayback;
