// modules/TokenAndSkillSummary.js
import React from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';

const TokenAndSkillSummary = ({ tokens = 0, skills = [] }) => {
  return (
    <Paper sx={{ p: 2, bgcolor: '#111', color: '#fff' }}>
      <Typography variant="h6" color="#0ff">Tokens Earned: {tokens}</Typography>
      <Box mt={2}>
        {skills.map((skill) => (
          <Typography key={skill} variant="body2" color="#0f0">
            {skill}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};


export default TokenAndSkillSummary;