import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';

const DependencyListView = ({ tasks, projectId }) => {
  const navigate = useNavigate();

  // Helper to build hierarchy
  const buildHierarchy = (taskList) => {
    const taskMap = {};
    taskList.forEach(t => taskMap[t.id] = { ...t, children: [] });

    const roots = [];
    taskList.forEach(t => {
      if (t.dependencies && t.dependencies.length > 0) {
        t.dependencies.forEach(depId => {
          if (taskMap[depId]) {
            taskMap[depId].children.push(taskMap[t.id]);
          }
        });
      } else {
        roots.push(taskMap[t.id]);
      }
    });

    // Deduplicate roots (a task might be a child of another, so only keep top-level)
    const topLevel = roots.filter(r => {
        return !taskList.some(t => t.dependencies && t.dependencies.includes(r.id));
    });

    return topLevel;
  };

  const hierarchy = buildHierarchy(tasks);

  const renderTaskNode = (node, depth = 0) => (
    <Box key={node.id} sx={{ ml: depth * 2, borderLeft: depth > 0 ? '1px dashed rgba(0, 243, 255, 0.3)' : 'none', pl: depth > 0 ? 2 : 0, mb: 1 }}>
      <Box
        onClick={() => navigate(`/visualizer/${projectId}/${node.id}`)}
        sx={{
          p: 1.5,
          backgroundColor: 'rgba(28, 28, 30, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="body2" sx={{ color: '#fff' }}>{node.name}</Typography>
        <Chip
            label={node.status}
            size="small"
            sx={{
                height: 20,
                fontSize: '0.65rem',
                backgroundColor: node.status === 'completed' ? 'success.main' : 'rgba(0, 243, 255, 0.1)',
                color: '#fff'
            }}
        />
      </Box>
      {node.children && node.children.map(child => renderTaskNode(child, depth + 1))}
    </Box>
  );

  return (
    <Box className="mobile-container" sx={{ mt: 2, pb: 4 }}>
      <Typography variant="h6" sx={{ color: '#00F3FF', mb: 2, fontWeight: 'bold' }}>
        Mission Dependency Tree
      </Typography>
      {hierarchy.length > 0 ? (
        hierarchy.map(root => renderTaskNode(root))
      ) : (
        <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>No tasks found in this project.</Typography>
      )}
    </Box>
  );
};

export default React.memo(DependencyListView);
