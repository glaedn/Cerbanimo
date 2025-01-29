import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Box, Typography } from '@mui/material';
import GalacticMap from '../pages/GalacticMap';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect(); // Ensure this is only called once
  };

  return (
    <Box position="relative" width="100vw" height="100vh" overflow="hidden">
      {/* Galactic Map as Background */}
      <Box position="absolute" top={0} left={0} width="100%" height="100%" zIndex={-1}>
        <GalacticMap />
      </Box>

      {/* Login UI */}
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" position="relative" zIndex={1}>
        <Typography variant="h4" gutterBottom color="white">
          Welcome to Cerbanimo
        </Typography>
        <Button variant="contained" color="primary" onClick={handleLogin}>
          Log In
        </Button>
      </Box>
    </Box>
  );
};

export default LoginPage;
