import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

const CivicMemoryArchive = ({ data }) => {
  const defaultEntries = [
    { id: 1, type: 'CRISIS_HISTORY', title: 'The Great Freeze 2026', date: 'Jan 12, 2026' },
    { id: 2, type: 'GOVERNANCE_EVOLUTION', title: 'Ratification of the Mutual Aid Treaty', date: 'Mar 05, 2026' },
    { id: 3, type: 'COMMUNITY_RITUAL', title: 'Summer Solstice Seed Exchange', date: 'Jun 21, 2026' },
    { id: 4, type: 'MISSION_LESSON', title: 'Optimizing Urban Foraging Routes', date: 'Aug 15, 2026' }
  ];

  const displayEntries = data && data.length > 0 ? data.map(item => ({
    id: item.id,
    type: item.type?.toUpperCase() || 'CIVIC_ENTRY',
    title: item.label,
    date: new Date(item.date).toLocaleDateString()
  })) : defaultEntries;

  return (
    <Box sx={{ p: 3, bgcolor: 'rgba(10, 10, 46, 0.6)', borderRadius: 2, border: '1px solid rgba(156, 39, 176, 0.3)' }}>
      <Typography variant="overline" sx={{ color: '#9C27B0', letterSpacing: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoStoriesIcon sx={{ fontSize: '1.2rem' }} /> INSTITUTIONAL_MEMORY_ARCHIVE
      </Typography>

      <List>
        {displayEntries.map((entry, index) => (
          <React.Fragment key={entry.id}>
            <ListItem sx={{ px: 0, '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.1)' }, cursor: 'pointer', transition: '0.2s' }}>
              <ListItemText
                primary={entry.title.toUpperCase()}
                secondary={entry.type}
                primaryTypographyProps={{ sx: { color: '#fff', fontFamily: 'Orbitron', fontSize: '0.9rem' } }}
                secondaryTypographyProps={{ sx: { color: '#9C27B0', fontSize: '0.7rem', fontWeight: 'bold' } }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Orbitron' }}>
                {entry.date}
              </Typography>
            </ListItem>
            {index < displayEntries.length - 1 && <Divider sx={{ borderColor: 'rgba(156, 39, 176, 0.1)' }} />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default CivicMemoryArchive;
