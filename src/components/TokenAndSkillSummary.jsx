// modules/TokenAndSkillSummary.js
import React from 'react';
import { Box, Typography, LinearProgress, Paper } from '@mui/material';

const TokenAndSkillSummary = ({ tokens = 0, skills = [] }) => {
  return (
    <Paper sx={{ p: 2, bgcolor: '#111', color: '#fff' }}>
      <Typography variant="h6" color="#0ff">Tokens Earned: {tokens}</Typography>
      <Box mt={2}>
        {skills.map((skill) => (
          <Box key={skill.name} mb={1}>
            <Typography variant="body2" color="#0f0">{skill.name}</Typography>
            <LinearProgress 
              variant="determinate"
              value={skill.level * 10}
              sx={{ height: 8, borderRadius: 2, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#f0f' } }}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default TokenAndSkillSummary;