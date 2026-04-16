import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const DependencyListView = ({ tasks, projectId }) => {
  const navigate = useNavigate();

  // Helper to build hierarchy
  const buildHierarchy = (taskList) => {
    const taskMap = {};
    const assignedIds = new Set();

    // Sort tasks to ensure stable root selection
    const sortedTasks = [...taskList].sort((a, b) => a.id - b.id);

    // First pass: create nodes
    sortedTasks.forEach(t => {
      taskMap[t.id] = { ...t, children: [] };
    });

    // Second pass: link children (only to the FIRST parent to keep it a tree)
    sortedTasks.forEach(t => {
      if (t.dependencies && Array.isArray(t.dependencies)) {
        for (const depId of t.dependencies) {
          const numericDepId = Number(depId);
          if (taskMap[numericDepId] && !assignedIds.has(t.id)) {
            taskMap[numericDepId].children.push(taskMap[t.id]);
            assignedIds.add(t.id);
            break; // Stop after first valid assignment
          }
        }
      }
    });

    // Third pass: identify roots (anything not assigned to a parent)
    let roots = sortedTasks
      .filter(t => !assignedIds.has(t.id))
      .map(t => taskMap[t.id]);

    // Fallback: If there are tasks but no roots (circular dependency),
    // pick the first task as a root to ensure something displays.
    if (roots.length === 0 && sortedTasks.length > 0) {
      roots = [taskMap[sortedTasks[0].id]];
    }

    return roots;
  };

  const hierarchy = buildHierarchy(tasks);

  const getStatusStyle = (status) => {
    if (status === 'completed') return { border: '1px solid #FF69B4', glow: 'rgba(255, 105, 180, 0.2)', bg: '#FF69B4', text: '#fff' };
    if (status === 'submitted') return { border: '1px solid #FFA500', glow: 'rgba(255, 165, 0, 0.2)', bg: '#FFA500', text: '#fff' };
    if (status.includes('assigned') || status === 'in_progress') return { border: '1px solid #00F3FF', glow: 'rgba(0, 243, 255, 0.2)', bg: '#00F3FF', text: '#000033' };
    if (status.includes('urgent')) return { border: '1px solid #FF0000', glow: 'rgba(255, 0, 0, 0.2)', bg: '#FF0000', text: '#fff' };
    return { border: '1px solid rgba(255,255,255,0.1)', glow: 'transparent', bg: 'rgba(0, 243, 255, 0.05)', text: '#00F3FF' };
  };

  const renderTaskNode = (node, depth = 0, isLast = false, parentIsLast = false, parentStatus = '') => {
    const status = node.status || 'available';
    const style = getStatusStyle(status);
    const hasChildren = node.children && node.children.length > 0;

    // Line color logic
    const getLineColor = (pStatus) => {
      if (pStatus === 'completed') return '#FF69B4';
      if (pStatus === 'submitted') return '#FFA500';
      return 'rgba(0, 243, 255, 0.3)';
    };
    const lineColor = getLineColor(parentStatus);

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(depth * 0.03, 0.5) }}
      >
        <Box sx={{
          ml: depth === 0 ? 0 : 2,
          position: 'relative',
          mb: 0.5,
          pt: 0
        }}>
          {/* Vertical line from parent that passes through this level */}
          {depth > 1 && !parentIsLast && (
            <Box sx={{
              position: 'absolute',
              left: -18,
              top: -10,
              bottom: -10,
              width: '1px',
              borderLeft: `1px solid ${lineColor}`,
              opacity: 0.3,
              zIndex: 0
            }} />
          )}

          {/* Vertical connection line for siblings/parent */}
          {depth > 0 && (
            <Box sx={{
              position: 'absolute',
              left: -10,
              top: -10,
              bottom: isLast ? 'calc(100% - 20px)' : -10,
              width: '1px',
              borderLeft: `1px solid ${lineColor}`,
              zIndex: 0
            }} />
          )}

          {/* Horizontal connection line to parent */}
          {depth > 0 && (
            <Box sx={{
              position: 'absolute',
              left: -10,
              top: 20,
              width: 10,
              height: '1px',
              borderTop: `1px solid ${lineColor}`,
              zIndex: 0
            }} />
          )}

          <Box
            component={motion.div}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (window.navigator.vibrate) window.navigator.vibrate(10);
              navigate(`/visualizer/${projectId}/${node.id}`);
            }}
            sx={{
              p: 1.25,
              backgroundColor: 'rgba(20, 20, 35, 0.85)',
              borderRadius: '6px',
              border: style.border,
              boxShadow: style.glow !== 'transparent' ? `0 0 12px ${style.glow}` : '0 2px 8px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
              position: 'relative',
              zIndex: 1,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#00F3FF',
                backgroundColor: 'rgba(30, 30, 50, 0.95)',
                transform: 'translateX(2px)'
              }
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                flexGrow: 1,
                wordBreak: 'break-word',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {node.name}
            </Typography>
            <Chip
                label={status.replace(/-/g, ' ').split(' ').pop()}
                size="small"
                sx={{
                    height: 18,
                    fontSize: '0.55rem',
                    flexShrink: 0,
                    backgroundColor: style.bg,
                    color: style.text,
                    border: 'none',
                    textTransform: 'uppercase',
                    fontFamily: 'Orbitron',
                    letterSpacing: '0.5px',
                    fontWeight: 'bold'
                }}
            />
          </Box>
          <Box sx={{ mt: 0.5 }}>
            {node.children && node.children.map((child, idx) =>
              renderTaskNode(child, depth + 1, idx === node.children.length - 1, isLast, status)
            )}
          </Box>
        </Box>
      </motion.div>
    );
  };

  return (
    <Box className="mobile-container" sx={{ mt: 2, pb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ color: '#00F3FF', fontWeight: 'bold', fontFamily: 'Orbitron', fontSize: '1rem' }}>
          Mission Tree
        </Typography>

        {/* Simple Legend for Mobile */}
        <Box display="flex" gap={1}>
           <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#FF69B4', alignSelf: 'center' }} />
           <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#FFA500', alignSelf: 'center' }} />
           <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#00F3FF', alignSelf: 'center' }} />
           <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#FF0000', alignSelf: 'center' }} />
        </Box>
      </Box>

      {hierarchy.length > 0 ? (
        <Box sx={{ mt: 1 }}>
          {hierarchy.map((root, idx) => renderTaskNode(root, 0, idx === hierarchy.length - 1))}
        </Box>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'rgba(28, 28, 30, 0.4)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            No operational tasks detected.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(DependencyListView);
