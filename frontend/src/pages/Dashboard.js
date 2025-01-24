import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const Dashboard = () => {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const saveUserToken = async () => {
      try {
        if (isAuthenticated && user) {
          // Get JWT token from Auth0
          const token = await getAccessTokenSilently();
          console.log('JWT Token:', token);

          // Save token in localStorage
          localStorage.setItem('token', token);

          // Send user data and token to the backend
          await axios.post('http://localhost:4000/auth/save-user', {
            sub: user.sub, // Auth0 user ID
            email: user.email,
            name: user.name,
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('User saved successfully!');
        }
      } catch (err) {
        console.error('Error saving user token or sending data:', err.response?.data || err.message);
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
