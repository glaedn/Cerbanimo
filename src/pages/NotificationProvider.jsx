import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import LevelNotification from '../components/LevelNotification/LevelNotification.jsx';

const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [levelNotificationData, setLevelNotificationData] = useState(null);
  const [showLevelNotification, setShowLevelNotification] = useState(false);

  // Helper function to parse notification messages
  const parseNotificationMessage = (notif) => {
    let parsedJson;
    const originalMsg = notif.message;

    try {
      parsedJson = JSON.parse(originalMsg);
    } catch (e) {
      parsedJson = null;
    }

    if (parsedJson && typeof parsedJson === 'object' && parsedJson.text) {
      return {
        ...notif,
        messageText: parsedJson.text,
        projectId: parsedJson.projectId,
        taskId: parsedJson.taskId,
        originalMessage: originalMsg,
      };
    } else {
      return {
        ...notif,
        messageText: originalMsg,
        projectId: null,
        taskId: null,
        originalMessage: originalMsg,
      };
    }
  };

  // Replace both handlers with this single version
useEffect(() => {
  if (!socket) return;

  const handleNotification = (incomingNotification) => {
    console.log("Received raw notification:", incomingNotification);
    const parsedNotification = parseNotificationMessage(incomingNotification);
    console.log("Parsed notification:", parsedNotification);
    
    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.id === parsedNotification.id)) return prev;
      
      // Add to beginning of array
      return [parsedNotification, ...prev];
    });
    
    // Only increment if not read
    if (!parsedNotification.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  socket.on('notification', handleNotification);

  return () => {
    socket.off('notification', handleNotification);
  };
}, [socket]); // Only socket as dependency

  // Fetch user ID and store it
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUserProfile = async () => {
      try {
        const token = await getAccessTokenSilently();
        const profileResponse = await axios.get('http://localhost:4000/profile', {
          params: {
            sub: user.sub,
            email: user.email,
            name: user.name
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (profileResponse.data && profileResponse.data.id) {
          setUserId(profileResponse.data.id);
        } else {
          console.error('No user ID found in profile response');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  // Fetch notifications once we have the user ID
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const fetchNotifications = async () => {
      try {
        const token = await getAccessTokenSilently();
        console.log(`Fetching notifications for user ID: ${userId}`);
        
        const res = await axios.get(`http://localhost:4000/notifications/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log('Notifications response:', res.data);
        
        // Check if notifications array exists in the response
        const rawNotificationsData = res.data.notifications || [];
        console.log('Raw notifications from fetch:', rawNotificationsData);

        const parsedNotificationsData = rawNotificationsData.map(parseNotificationMessage);
        console.log('Parsed notifications from fetch:', parsedNotificationsData);
        
        setNotifications(parsedNotificationsData);
        
        // Count unread notifications
        const unreadNotifications = parsedNotificationsData.filter(n => !n.read);
        setUnreadCount(unreadNotifications.length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, userId, getAccessTokenSilently]);

  useEffect(() => {
    if (!socket) return;

    const handleLevelUpdate = (data) => {
      console.log("Received levelUpdate:", data); // Add this
      const { previousXP, newXP, previousLevel, newLevel } = data;
      setLevelNotificationData({ previousXP, newXP, previousLevel, newLevel });
      setShowLevelNotification(true);
      setTimeout(() => setShowLevelNotification(false), 6000);
    };

    socket.on("levelUpdate", handleLevelUpdate);

    return () => socket.off("levelUpdate", handleLevelUpdate);
  }, [socket]);
  

  // Setup socket connection
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const setupSocket = async () => {
      try {
        const token = await getAccessTokenSilently();
        
        // Connect to socket with query params
        const newSocket = io("http://localhost:4000", {
          transports: ["websocket"],
          query: { userId }
        });
        
        setSocket(newSocket);
        
        newSocket.on("connect", () => {
          console.log("Socket connected:", newSocket.id);
          newSocket.emit("join", userId);
        });
      } catch (err) {
        console.error("Error setting up socket:", err);
      }
    };
    
    setupSocket();
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, userId, getAccessTokenSilently]);
  
  // Function to mark notifications as read
  const markAsRead = async (notificationIds) => {
    if (!isAuthenticated || !userId) return;
    
    // Convert IDs to strings to avoid integer overflow issues with backend
    const notificationIdsAsStrings = notificationIds.map(id => id.toString());

    try {
        const token = await getAccessTokenSilently();
        await axios.post(
            'http://localhost:4000/notifications/read',
            { notificationIds: notificationIdsAsStrings },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        
        // Update local state AFTER the API call completes
        setNotifications(prev => 
            prev.map(notification => 
                notificationIdsAsStrings.includes(notification.id.toString()) 
                    ? { ...notification, read: true } 
                    : notification
            )
        );
        
        // Set the exact count instead of decrementing to avoid race conditions
        const newUnreadCount = (prev => {
            const remainingUnread = prev.filter(n => !n.read && !notificationIdsAsStrings.includes(n.id.toString()));
            return remainingUnread.length;
        })(notifications);
        
        setUnreadCount(newUnreadCount);
    } catch (err) {
        console.error('Error marking notifications as read:', err);
    }
};

return (
  <NotificationContext.Provider
    value={{ 
      notifications, 
      unreadCount, 
      markAsRead 
    }}
  >
    {showLevelNotification && levelNotificationData && (
      <LevelNotification
        previousXP={levelNotificationData.previousXP}
        newXP={levelNotificationData.newXP}
        previousLevel={levelNotificationData.previousLevel}
        newLevel={levelNotificationData.newLevel}
        onClose={() => setShowLevelNotification(false)}
      />
    )}
    {children}
  </NotificationContext.Provider>
);

};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationProvider;