import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useNotifications } from '../../../pages/NotificationProvider'; // Adjusted path
import '../HUDPanel.css'; // Shared panel styles
// import './CommsLog.css'; // Optional: For specific CommsLog styles if needed
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ListAltIcon from '@mui/icons-material/ListAlt';
import InfoIcon from '@mui/icons-material/Info';

const getNotificationIcon = (type) => {
  if (!type) type = 'default'; // Handle undefined type

  switch (type.toLowerCase()) { // Use toLowerCase for case-insensitive matching
    case 'task-approved':
      return <TaskAltIcon style={{ marginRight: '8px' }} />;
    case 'task-rejected':
      return <CancelIcon style={{ marginRight: '8px' }} />;
    case 'task-submitted': // If you anticipate this type
      return <NotificationsActiveIcon style={{ marginRight: '8px' }} />;
    case 'task': // For generic tasks
      return <ListAltIcon style={{ marginRight: '8px' }} />;
    default:
      return <InfoIcon style={{ marginRight: '8px' }} />;
  }
};

const CommsLog = () => {
  const { notifications } = useNotifications(); // Consuming the context
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (e) => {
    // Prevent click event from bubbling up if the button itself was clicked
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  // Removed the useEffect hook that used sampleActivities and setInterval
  // Removed activityLog state, will use notifications directly

  // Removed the useEffect hook that used sampleActivities and setInterval
  // Removed activityLog state, will use notifications directly

  // Display all notifications, no longer slicing for the latest 3
  // const latestNotifications = notifications ? notifications.slice(0, 3) : [];

  return (
    <div className={`hud-panel comms-log ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Comms Log</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Comms Log" : "Minimize Comms Log"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content" style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {notifications === null || notifications === undefined ? ( // Check if notifications context is not yet available
            <p>Loading comms...</p>
          ) : notifications.length > 0 ? ( // Check full notifications array
            <ul>
              {notifications.map((notification) => { // Map over full notifications array
                const icon = getNotificationIcon(notification.type); // Get the icon
                return (
                  <li key={notification.id} className="activity-item" style={{ display: 'flex', alignItems: 'center' }}>
                    {icon} {/* Render the icon */}
                    {notification.projectId && notification.taskId ? (
                      <Link 
                        to={`/visualizer/${notification.projectId}/${notification.taskId}`} 
                        style={{ textDecoration: 'underline', color: '#FFF' }} // Styling for clickable link
                      >
                        {notification.messageText}
                      </Link>
                    ) : (
                      notification.messageText // Displaying parsed messageText
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No new activity.</p> 
          )}
        </div>
      )}
    </div>
  );
};

export default CommsLog;
