import React from 'react';
import Modal from '@mui/material/Modal';
// import Box from '@mui/material/Box'; // No longer needed if only used for spinner
import Typography from '@mui/material/Typography';
// import CircularProgress from '@mui/material/CircularProgress'; // No longer needed
import './LoadingPopup.css';

const LoadingPopup = ({ open, messages }) => {
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : "";

  return (
    <Modal open={open} aria-labelledby="loading-popup-title">
      <div className="loading-popup-cyber-modal">
        <div className="loading-popup-cyber-border">
          <div className="loading-popup-cyber-content">
            <Typography variant="h6" id="loading-popup-title" className="loading-popup-title">
              {lastMessage}
            </Typography>
             {/* New CSS Spinner */}
             <div className="cyber-loader"></div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LoadingPopup;
