import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import { motion } from 'framer-motion';

const WaitingListPage = () => {
  return (
    <Box position="relative" width="100vw" height="100vh" overflow="hidden">
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
              Cerbanimo Galaxy
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
                background: 'linear-gradient(to right,rgb(22, 42, 65),rgb(89, 13, 156))',
              }}
            >
              <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ color: 'white' }}>
                Thank you for your interest!
              </Typography>

              <Typography variant="body1" component="p" align="center" sx={{ mb: 3, color: 'white' }}>
                Thank you for your interest in joining the Cerbanimo Galaxy! We'll email you as soon as you are granted access.
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

export default WaitingListPage;
