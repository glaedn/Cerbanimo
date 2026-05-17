import * as React from 'react'
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { Button, Box, } from '@mui/material';
import GalacticActivityMap from '../components/GalacticActivityMap/GalacticActivityMap.jsx';
import LivingMap from '../components/Map/LivingMap.jsx';
import AdaptiveHUD from '../components/HUD/AdaptiveHUD.jsx';
import { useAppStore } from '../store/useAppStore';
import './Dashboard.css';


const Dashboard = () => {
  const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();
  const viewMode = useAppStore(state => state.viewMode);
  const setMapState = useAppStore(state => state.setMapState);

  const navigate = useNavigate(); // Properly declare navigate using useNavigate

  const goToProfile = () => {
    navigate('/profile'); // Ensure the `/profile` route is properly defined
  };

  const goToProjects = () => {
    navigate('/projects');
  }

  useEffect(() => {
    const saveUserToken = async () => {
      try {
        if (isAuthenticated && user) {
          // Get JWT token from Auth0
          const token = await getAccessTokenSilently({
            audience: import.meta.env.VITE_BACKEND_URL, // Example audience
          });
          // Save token in localStorage
          localStorage.setItem('token', token);

          // Send user data and token to the backend
          const saveResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/save-user`, {
            sub: user.sub, // Auth0 user ID
            email: user.email,
            name: user.name,
            picture: user.picture,
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('User saved successfully!');

          // If the response contains location data, center the map
          const dbUser = saveResponse.data.user;
          if (dbUser?.location?.coordinates &&
              dbUser.location.coordinates[1] !== 0 &&
              dbUser.location.coordinates[0] !== 0) {

            console.log('Centering map on user location:', dbUser.location.coordinates);

            setMapState({
              latitude: parseFloat(dbUser.location.coordinates[1]),
              longitude: parseFloat(dbUser.location.coordinates[0]),
              zoom: 12,
              pitch: 45,
              bearing: 0
            });
          }
        }
      } catch (err) {
        console.error('Error saving user token or sending data:', err.response?.data || err.message);
      }
    };

    saveUserToken();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  // Fix for mobile viewport height
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  return (
    <AdaptiveHUD>
      {viewMode === 'map' ? <LivingMap /> : <GalacticActivityMap />}
    </AdaptiveHUD>
  );
};

export default Dashboard;
