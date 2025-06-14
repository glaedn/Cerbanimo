// modules/TokenAndSkillSummary.js
import React from 'react';
import { Box, Typography, Paper } from '@mui/material'; // Removed LinearProgress as it's not used

// Assuming theme.js is not directly importable here for sx prop, using hex codes.
// theme.colors.primary: '#00F3FF' (neon cyan/blue)
// theme.colors.secondary: '#FF5CA2' (neon pink)
// theme.colors.textPrimary: '#FFFFFF' (white)
// theme.colors.backgroundPaper: '#1C1C1E' (dark gray)
// theme.spacing.sm: '1rem'
// theme.borders.borderRadiusSm: '4px'

const TokenAndSkillSummary = ({ tokens = 0, skills = [] }) => {
  // Ensure skills is an array, default to empty if undefined or null
  const validSkills = Array.isArray(skills) ? skills : [];

  return (
    <Paper sx={{ 
      p: '1rem', // theme.spacing.sm
      bgcolor: '#1C1C1E', // theme.colors.backgroundPaper
      color: '#FFFFFF' // theme.colors.textPrimary for default text
    }}>
      <Typography variant="h6" sx={{ color: '#00F3FF', mb: '1rem' }}> {/* theme.colors.primary, added margin bottom */}
        Tokens Earned: {tokens}
      </Typography>
      <Box mt={2}>
        {validSkills.map((skill) => (
          <Box 
            key={skill.id || skill.skill_id || skill.skill_name || skill.name} 
            sx={{ 
              backgroundColor: 'rgba(0, 243, 255, 0.2)', // theme.colors.primary with alpha
              border: '1px solid #00F3FF', // theme.colors.primary
              padding: '1rem', // theme.spacing.sm
              marginBottom: '1rem', // theme.spacing.sm
              borderRadius: '4px', // theme.borders.borderRadiusSm
              color: '#FFFFFF' // theme.colors.textPrimary for default text
            }}
          >
            <Typography variant="h6" sx={{ color: '#FFFFFF' }}> {/* theme.colors.textPrimary */}
              {skill.skill_name || skill.name}
            </Typography>
            {/* Level display removed */}
            <Typography variant="body2" sx={{ color: '#FF5CA2' }}> {/* theme.colors.secondary */}
              Tokens: {skill.tokens || 0}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};


export default TokenAndSkillSummary;