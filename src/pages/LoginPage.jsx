import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Box, Typography, Paper, Container } from '@mui/material';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect();
  };

  return (
    <Box position="relative" width="100vw" height="100vh" overflow="hidden">

      {/* Login UI */}
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100vh"
          position="relative"
          zIndex={1}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Typography variant="h2" component="h1" align="center" gutterBottom sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}>
              Welcome to Cerbanimo
            </Typography>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <Paper 
              elevation={6} 
              sx={{ 
                padding: 4, 
                marginTop: 4, 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h5" component="h2" gutterBottom align="center">
                Join the Collaborative Universe
              </Typography>
              
              <Typography variant="body1" paragraph align="center" sx={{ mb: 3 }}>
                Sign in to start contributing, earning tokens, and building communities in a decentralized ecosystem.
              </Typography>
              
              <Box display="flex" justifyContent="center" mt={2}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleLogin}
                    size="large"
                    sx={{ 
                      paddingX: 4, 
                      paddingY: 1,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    Log In with Auth0
                  </Button>
                </motion.div>
              </Box>
              
              <Typography variant="body2" align="center" sx={{ mt: 3, opacity: 0.7 }}>
                New to Cerbanimo? Your journey begins with a single login.
              </Typography>
            </Paper>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Typography variant="body2" color="white" align="center" sx={{ mt: 4 }}>
              © 2025 Cerbanimo. Built for contributors, by contributors.
            </Typography>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;