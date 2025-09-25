import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../../pages/NotificationProvider';
import {
  CommsLogContainer,
  LogItem,
} from './CommsLog.styles';
import { HUDPanelHeader, HUDPanelTitle, HUDPanelList } from '../HUDPanel.styles';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ListAltIcon from '@mui/icons-material/ListAlt';
import InfoIcon from '@mui/icons-material/Info';

const getNotificationIcon = (type) => {
  if (!type) type = 'default'; // Handle undefined type

  switch (type.toLowerCase()) { // Use toLowerCase for case-insensitive matching
    case 'quest-approved':
      return <TaskAltIcon style={{ marginRight: '8px' }} />;
    case 'quest-rejected':
      return <CancelIcon style={{ marginRight: '8px' }} />;
    case 'quest-submitted': // If you anticipate this type
      return <NotificationsActiveIcon style={{ marginRight: '8px' }} />;
    case 'quest': // For generic quests
      return <ListAltIcon style={{ marginRight: '8px' }} />;
    default:
      return <InfoIcon style={{ marginRight: '8px' }} />;
  }
};

const CommsLog = ({ showHeader = true }) => {
  const { notifications } = useNotifications();
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  return (
    <CommsLogContainer>
      {showHeader && (
        <HUDPanelHeader onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
          <HUDPanelTitle>Comms Log</HUDPanelTitle>
          <button onClick={toggleMinimize} aria-label={isMinimized ? `Expand Comms Log` : `Minimize Comms Log`}>
            {isMinimized ? '+' : '-'}
          </button>
        </HUDPanelHeader>
      )}
      {!isMinimized && (
        <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
          {notifications === null || notifications === undefined ? (
            <p>Loading transmissions...</p>
          ) : notifications.length > 0 ? (
            <HUDPanelList>
              {notifications.map((notification) => {
                const icon = getNotificationIcon(notification.type);
                return (
                  <LogItem key={notification.id} style={{ display: 'flex', alignItems: 'center' }}>
                    {icon}
                    {notification.projectId && notification.taskId ? (
                      <Link 
                        to={`/visualizer/${notification.projectId}/${notification.taskId}`} 
                        style={{ textDecoration: 'underline', color: 'inherit' }}
                      >
                        {notification.messageText}
                      </Link>
                    ) : (
                      notification.messageText
                    )}
                  </LogItem>
                );
              })}
            </HUDPanelList>
          ) : (
            <p>No new transmissions.</p>
          )}
        </div>
      )}
    </CommsLogContainer>
  );
};

export default CommsLog;
