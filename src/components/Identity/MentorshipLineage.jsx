import React from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const MentorshipLineage = ({ data }) => {
  const defaultLineage = [
    { id: 1, name: 'Sarah Chen', role: 'Mentor', skill: 'Crisis Logistics', avatar: '' },
    { id: 2, name: 'You', role: 'Coordinator', skill: 'Mutual Aid Routing', avatar: '' },
    { id: 3, name: 'Marcus Bell', role: 'Apprentice', skill: 'Community Outreach', avatar: '' }
  ];

  const displayLineage = data && data.length > 0 ? data.map(item => ({
    id: item.id,
    name: item.mentor_name || item.mentee_name,
    skill: item.skill_name || 'General Contribution',
    avatar: ''
  })) : defaultLineage;

  return (
    <Box sx={{ p: 3, bgcolor: 'rgba(0, 215, 135, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 215, 135, 0.2)' }}>
      <Typography variant="overline" sx={{ color: '#00D787', letterSpacing: 2, mb: 3, display: 'block' }}>
        KNOWLEDGE_INHERITANCE_LINEAGE
      </Typography>

      <Stack spacing={2} alignItems="center">
        {displayLineage.map((node, index) => (
          <React.Fragment key={node.id}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              bgcolor: node.name === 'You' ? 'rgba(0, 215, 135, 0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${node.name === 'You' ? '#00D787' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 2,
              width: '100%',
              maxWidth: '300px'
            }}>
              <Avatar src={node.avatar} sx={{ border: `2px solid ${node.name === 'You' ? '#00D787' : 'transparent'}` }}>
                {node.name[0]}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff' }}>{node.name.toUpperCase()}</Typography>
                <Typography variant="caption" sx={{ color: '#00D787', display: 'block' }}>{node.skill.toUpperCase()}</Typography>
              </Box>
            </Box>
            {index < displayLineage.length - 1 && (
              <ArrowDownwardIcon sx={{ color: 'rgba(0, 215, 135, 0.4)' }} />
            )}
          </React.Fragment>
        ))}
      </Stack>
    </Box>
  );
};

export default MentorshipLineage;
