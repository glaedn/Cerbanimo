import React from 'react';
import PropTypes from 'prop-types';
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Chip,
  Button,
  Box,
  Paper
} from '@mui/material';
import {
  SwapHoriz, // Default icon
  CheckCircleOutline, // Fulfilled
  HourglassEmpty, // Pending
  Cancel // Cancelled/Declined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom'; // For navigation on button click

// import './TransactionList.css'; // Import common styles

// Function to get current user ID (placeholder, adapt to your app's auth context)
const getCurrentUserId = () => localStorage.getItem('userId');


const getStatusChipColor = (status) => {
  switch (status) {
    case 'pending_provider_acceptance':
    case 'pending_receiver_acceptance':
      return 'warning'; // MUI Chip color prop
    case 'accepted':
      return 'info';
    case 'fulfilled':
      return 'success';
    case 'cancelled_by_provider':
    case 'cancelled_by_receiver':
    case 'declined_by_provider':
    case 'declined_by_receiver':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'pending_provider_acceptance':
        case 'pending_receiver_acceptance':
            return <HourglassEmpty />;
        case 'accepted':
            return <CheckCircleOutline sx={{ color: 'green' }}/>; // Example custom color
        case 'fulfilled':
            return <CheckCircleOutline color="success" />;
        case 'cancelled_by_provider':
        case 'cancelled_by_receiver':
        case 'declined_by_provider':
        case 'declined_by_receiver':
            return <Cancel color="error" />;
        default:
            return <SwapHoriz />;
    }
};


const TransactionListItem = ({ transaction }) => {
  const navigate = useNavigate();
  const currentUserIdStr = getCurrentUserId(); // User ID from storage is likely a string

  if (!transaction) return null;

  const {
    id,
    need_name,
    resource_name,
    provider_user_id,
    receiver_user_id,
    provider_username, // Assuming backend provides this
    receiver_username, // Assuming backend provides this
    provider_community_name,
    receiver_community_name,
    status,
    updated_at,
  } = transaction;

  const currentUserIdNum = parseInt(currentUserIdStr, 10);
  let otherPartyName = 'N/A';
  let role = 'N/A';

  if (provider_user_id === currentUserIdNum) {
    role = 'Provider';
    otherPartyName = receiver_username || (receiver_community_name ? `${receiver_community_name} (Community)` : 'Unknown Receiver');
  } else if (receiver_user_id === currentUserIdNum) {
    role = 'Receiver';
    otherPartyName = provider_username || (provider_community_name ? `${provider_community_name} (Community)` : 'Unknown Provider');
  } else {
    // Fallback if current user is neither direct provider nor receiver (e.g. admin, or community member not directly listed)
    // This might happen if the transaction list query includes community-level involvement not yet fully handled here.
    role = 'Observer'; // Or determine based on community IDs if available and user is part of them.
    otherPartyName = `Provider: ${provider_username || provider_community_name || 'N/A'}, Receiver: ${receiver_username || receiver_community_name || 'N/A'}`;
  }


  const handleViewDetails = () => {
    console.log('View Details for transaction ID:', id);
    // For now, navigating to a placeholder. This should be a defined route in your app.
    navigate(`/transactions/${id}`);
  };

  const formattedDate = new Date(updated_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <Paper elevation={2} sx={{ mb: 2, borderRadius: '8px' }} className="transaction-list-item">
      <ListItem alignItems="flex-start">
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: getStatusChipColor(status) + '.main' }}> {/* Use theme color */}
            {getStatusIcon(status)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="subtitle1" component="div">
              {resource_name ? `Resource: ${resource_name}` : 'Resource N/A'}
              {need_name && ` (for Need: ${need_name})`}
            </Typography>
          }
          secondary={
            <>
              <Typography component="span" variant="body2" color="text.primary">
                Your Role: {role}
              </Typography>
              <br />
              <Typography component="span" variant="body2" color="text.secondary">
                Interacting with: {otherPartyName}
              </Typography>
              <br />
              <Typography component="span" variant="body2" color="text.secondary">
                Last Updated: {formattedDate}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={status.replace(/_/g, ' ').toUpperCase()}
                  color={getStatusChipColor(status)}
                  size="small"
                  className={`status-chip status-${status}`} // For potential CSS targeting
                />
              </Box>
            </>
          }
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleViewDetails}
          sx={{ alignSelf: 'center', ml: 2 }}
        >
          View Details
        </Button>
      </ListItem>
    </Paper>
  );
};

TransactionListItem.propTypes = {
  transaction: PropTypes.shape({
    id: PropTypes.number.isRequired,
    need_id: PropTypes.number,
    resource_id: PropTypes.number,
    need_name: PropTypes.string, // Added by backend join
    resource_name: PropTypes.string, // Added by backend join
    provider_user_id: PropTypes.number,
    receiver_user_id: PropTypes.number,
    provider_username: PropTypes.string, // Added by backend join
    receiver_username: PropTypes.string, // Added by backend join
    provider_community_id: PropTypes.number,
    receiver_community_id: PropTypes.number,
    provider_community_name: PropTypes.string, // Added by backend join
    receiver_community_name: PropTypes.string, // Added by backend join
    status: PropTypes.string.isRequired,
    message: PropTypes.string,
    created_at: PropTypes.string.isRequired,
    updated_at: PropTypes.string.isRequired,
  }).isRequired,
};

export default TransactionListItem;
