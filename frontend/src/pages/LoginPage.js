import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Typography } from '@mui/material';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <Typography variant="h4" gutterBottom>Welcome to Cerbanimo</Typography>
      <Button variant="contained" color="primary" onClick={() => loginWithRedirect()}>
        Log In
      </Button>
    </Box>
  );
};

export default LoginPage;
