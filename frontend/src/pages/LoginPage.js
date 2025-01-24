import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Box, Typography } from '@mui/material';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect(); // Ensure this is only called once
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <Typography variant="h4" gutterBottom>Welcome to Cerbanimo</Typography>
      <Button variant="contained" color="primary" onClick={handleLogin}>
        Log In
      </Button>
    </Box>
  );
};

export default LoginPage;
