import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

const useNotifications = (userId) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getToken = async () => {
    try {
      return await getAccessTokenSilently({
        audience: 'http://localhost:4000',
        scope: 'openid profile email',
      });
    } catch (e) {
      console.error('Error getting access token in useNotifications', e);
      throw e;
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId || !isAuthenticated) {
        setLoading(false);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        // Ensure the endpoint matches the backend; using /notifications/user/:userId as a common pattern
        const response = await axios.get(`http://localhost:4000/notifications/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const fetchedNotifications = response.data.map(notif => ({
            id: notif.id,
            message: notif.message,
            type: notif.type || 'info', // Default type if not provided
            created_at: notif.created_at,
            read: notif.read === true || notif.read === 1, // Normalize boolean
        }));
        
        setNotifications(fetchedNotifications);
        
        const count = fetchedNotifications.filter(n => !n.read).length;
        setUnreadCount(count);

      } catch (err) {
        console.error('Error fetching notifications:', err.response?.data || err.message);
        setError(err.response?.data?.error || err.message || 'Failed to fetch notifications');
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  return { notifications, unreadCount, loading, error };
};

export default useNotifications;
