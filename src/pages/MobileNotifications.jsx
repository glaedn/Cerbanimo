import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  IconButton
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useNotifications } from './NotificationProvider';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ListAltIcon from '@mui/icons-material/ListAlt';
import InfoIcon from '@mui/icons-material/Info';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { motion } from 'framer-motion';

const getNotificationIcon = (type) => {
  if (!type) type = 'default';
  switch (type.toLowerCase()) {
    case 'task-approved':
      return <TaskAltIcon />;
    case 'task-rejected':
      return <CancelIcon />;
    case 'task-submitted':
    case 'service_purchase':
      return <NotificationsActiveIcon />;
    case 'task':
      return <ListAltIcon />;
    default:
      return <InfoIcon />;
  }
};

const MobileNotifications = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  useEffect(() => {
    // Optional: Mark all as read when viewing this page
    if (unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [unreadCount, notifications, markAsRead]);

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      sx={{ p: 2, pb: 10, pt: 7, minHeight: '100vh', backgroundColor: 'transparent' }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ color: '#00F3FF', fontWeight: 'bold', fontFamily: 'Orbitron' }}>
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <IconButton onClick={handleMarkAllRead} sx={{ color: '#00F3FF' }} title="Mark all as read">
            <DoneAllIcon />
          </IconButton>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'rgba(5, 16, 34, 0.78)', border: '1px solid rgba(95, 240, 255, 0.28)' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No notifications yet.</Typography>
        </Paper>
      ) : (
        <List>
          {notifications.map((notif) => (
            <React.Fragment key={notif.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  backgroundColor: notif.read ? 'transparent' : 'rgba(0, 243, 255, 0.05)',
                  borderRadius: '8px',
                  mb: 1,
                  border: notif.read ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0, 243, 255, 0.3)'
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ backgroundColor: 'transparent', color: notif.read ? 'rgba(255,255,255,0.5)' : '#00F3FF' }}>
                    {getNotificationIcon(notif.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ color: notif.read ? 'rgba(255,255,255,0.7)' : '#fff' }}>
                      {notif.type === 'service_purchase' && notif.buyerId && notif.buyerUsername ? (
                        <>
                          <Link
                            to={`/profile/public/${notif.buyerId}`}
                            style={{ textDecoration: 'underline', color: '#ff5ca2', fontWeight: 'bold' }}
                          >
                            {notif.buyerUsername}
                          </Link>
                          {' has purchased your service: '}
                          <Link
                            to={`/Visualizer/${notif.projectId}`}
                            style={{ textDecoration: 'underline', color: '#00f3ff', fontWeight: 'bold' }}
                          >
                            {notif.serviceName || 'Project'}
                          </Link>
                          {'!'}
                        </>
                      ) : notif.projectId ? (
                        <Link
                          to={notif.taskId ? `/Visualizer/${notif.projectId}/${notif.taskId}` : `/Visualizer/${notif.projectId}`}
                          style={{
                            textDecoration: "underline",
                            color: "#8db8ff",
                          }}
                        >
                          {notif.messageText}
                        </Link>
                      ) : (
                        notif.messageText
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(notif.created_at).toLocaleString()}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default MobileNotifications;
