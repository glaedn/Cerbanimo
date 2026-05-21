import React from 'react';
import { Box, Typography, Paper, IconButton, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import './CoordinationSignal.css';

const CoordinationSignal = ({ signal, onAction }) => {
  if (!signal) return null;

  const getIcon = () => {
    switch (signal.type) {
      case 'crisis': return <WarningAmberIcon className="signal-icon critical" />;
      case 'friction': return <WarningAmberIcon className="signal-icon friction" />;
      case 'opportunity': return <RocketLaunchIcon className="signal-icon opportunity" />;
      case 'narrative': return <HistoryEduIcon className="signal-icon narrative" />;
      default: return <InfoOutlinedIcon className="signal-icon guidance" />;
    }
  };

  const getClassName = () => {
    return `coordination-signal signal-type-${signal.type} priority-${signal.priority}`;
  };

  return (
    <Paper className={getClassName()} elevation={0}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {getIcon()}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" className="signal-message">
            {signal.message}
          </Typography>
          {signal.persona && (
            <Typography variant="caption" className="signal-persona">
              {signal.persona}
            </Typography>
          )}
        </Box>
        {signal.action && (
          <Chip
            label="ACT"
            size="small"
            onClick={() => onAction && onAction(signal.action)}
            className="signal-action-chip"
          />
        )}
      </Box>
    </Paper>
  );
};

export default CoordinationSignal;
