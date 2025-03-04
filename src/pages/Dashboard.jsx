import * as React from 'react'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { Button, Box, } from '@mui/material';
import GalacticMap from './GalacticMap.jsx';
import './Dashboard.css';
//import GalacticMap from '../pages/GalacticMap';


const Dashboard = () => {
  const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();
  
  const navigate = useNavigate(); // Properly declare navigate using useNavigate

  const goToProfile = () => {
    navigate('/profile'); // Ensure the `/profile` route is properly defined
  };

  useEffect(() => {
    const saveUserToken = async () => {
      try {
        if (isAuthenticated && user) {
          // Get JWT token from Auth0
          const token = await getAccessTokenSilently({
            //audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        });
          console.log('JWT Token:', token);
          console.log('User is authenticated, caching session...');
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
    <Box className="dashboard-container">
      <Box className="task-browser-wrapper"><GalacticMap />
      </Box>
      <Box className="dashboard-footer">
        <Button className="dashboard-button" variant="contained" color="primary" onClick={goToProfile}>
          Profile
        </Button>
        <Button className="dashboard-button" variant="contained" color="secondary" onClick={() => logout({ returnTo: window.location.origin })}>
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;
