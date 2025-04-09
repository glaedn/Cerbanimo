import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!socket) return;
  
    // This should receive the actual notification object, not just increment blindly
    const handleNewNotification = (notification) => {
      // Check if we already have this notification in state
      if (notifications.some(n => n.id === notification.id)) {
        console.log('Duplicate notification received:', notification.id);
        return; // Skip processing for duplicates
      }
  
      // Add the notification to state
      setNotifications(prev => [...prev, notification]);
      
    };
  
    socket.on('notification', handleNewNotification);
  
    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket, notifications]);

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
        const notificationsData = res.data.notifications || [];
        console.log('Parsed notifications:', notificationsData);
        
        setNotifications(notificationsData);
        
        // Count unread notifications
        const unreadNotifications = notificationsData.filter(n => !n.read);
        setUnreadCount(unreadNotifications.length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, userId, getAccessTokenSilently]);

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
        
        newSocket.on("notification", (notification) => {
          console.log("New notification received:", notification);
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
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
    
    try {
        const token = await getAccessTokenSilently();
        await axios.post(
            'http://localhost:4000/notifications/read',
            { notificationIds },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        
        // Update local state AFTER the API call completes
        setNotifications(prev => 
            prev.map(notification => 
                notificationIds.includes(notification.id) 
                    ? { ...notification, read: true } 
                    : notification
            )
        );
        
        // Set the exact count instead of decrementing to avoid race conditions
        const newUnreadCount = (prev => {
            const remainingUnread = prev.filter(n => !n.read && !notificationIds.includes(n.id));
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
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationProvider;