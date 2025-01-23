import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../utils/api';

const Dashboard = () => {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const saveUserToken = async () => {
      try {
        if (isAuthenticated && user) {
          const token = await getAccessTokenSilently();
          console.log('JWT Token:', token);

          // Save token in localStorage or send it to the backend
          localStorage.setItem('token', token);

          // Optional: Save user details to the backend
          await api.post('/auth/save-user', {
            sub: user.sub,
            email: user.email,
            name: user.name,
            token, // Include the token if needed
          });
        }
      } catch (err) {
        console.error('Error saving user token:', err);
      }
    };

    saveUserToken();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  return (
    <div>
      <h1>Welcome to the Dashboard</h1>
    </div>
  );
};

export default Dashboard;
