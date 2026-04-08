import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Divider, IconButton, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import ImpactGraph from '../components/HUD/ImpactGraph/ImpactGraph';
import { useIsMobile } from '../hooks/useIsMobile';
import './ImpactAtlas.css';

const ImpactAtlas = () => {
  const isMobile = useIsMobile();
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/impact_v2/atlas`);
        const json = await res.json();
        setGraphData(json);
      } catch (err) {
        console.error("Failed to fetch impact data:", err);
      }
    };
    fetchData();
  }, []);

  const filteredNodes = graphData.nodes.filter(n => selectedType === 'all' || n.type === selectedType);

  return (
    <Box className={`impact-atlas-container ${isMobile ? 'mobile-atlas' : ''}`} sx={{ pb: isMobile ? 12 : 4 }}>
      <div className="hud-header">
        <h1 className="hud-title">{isMobile ? 'IMPACT ATLAS' : 'IMPACT ATLAS [GLOBAL]'}</h1>
        <div className="hud-status">STATUS: {isMobile ? 'SYNC_ACTIVE' : 'SYNCHRONIZING_IMPACT_GRAPHS...'}</div>
      </div>

      <Box className="atlas-main">
        {isMobile ? (
          <Box p={2}>
            <Box display="flex" gap={1} mb={3} overflow="auto" sx={{ pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
              <Chip
                label="ALL"
                onClick={() => setSelectedType('all')}
                sx={{ height: '48px', px: 2, bgcolor: selectedType === 'all' ? '#00f3ff' : 'transparent', color: selectedType === 'all' ? '#000' : '#00f3ff', border: '1px solid #00f3ff', fontFamily: 'Orbitron' }}
              />
              <Chip
                label="OUTCOMES"
                onClick={() => setSelectedType('outcome')}
                sx={{ height: '48px', px: 2, bgcolor: selectedType === 'outcome' ? '#ff00ff' : 'transparent', color: selectedType === 'outcome' ? '#000' : '#ff00ff', border: '1px solid #ff00ff', fontFamily: 'Orbitron' }}
              />
              <Chip
                label="PROJECTS"
                onClick={() => setSelectedType('project')}
                sx={{ height: '48px', px: 2, bgcolor: selectedType === 'project' ? '#00f3ff' : 'transparent', color: selectedType === 'project' ? '#000' : '#00f3ff', border: '1px solid #00f3ff', fontFamily: 'Orbitron' }}
              />
              <Chip
                label="TASKS"
                onClick={() => setSelectedType('task')}
                sx={{ height: '48px', px: 2, bgcolor: selectedType === 'task' ? '#ffffff' : 'transparent', color: selectedType === 'task' ? '#000' : '#ffffff', border: '1px solid #ffffff', fontFamily: 'Orbitron' }}
              />
            </Box>

            <Paper sx={{ bgcolor: 'rgba(10, 10, 46, 0.8)', border: '1px solid rgba(0, 243, 255, 0.3)', borderRadius: 2, mb: 3 }}>
              <List>
                {filteredNodes.length > 0 ? filteredNodes.map(node => (
                  <ListItem key={node.id} divider sx={{ borderColor: 'rgba(0, 243, 255, 0.2)' }}>
                    <ListItemText
                      primary={node.label.toUpperCase()}
                      secondary={node.type.toUpperCase()}
                      primaryTypographyProps={{ sx: { color: '#00f3ff', fontFamily: 'Orbitron', fontSize: '0.9rem' } }}
                      secondaryTypographyProps={{ sx: { color: node.type === 'outcome' ? '#ff00ff' : '#888', fontSize: '0.7rem' } }}
                    />
                  </ListItem>
                )) : (
                  <ListItem><ListItemText primary="NO DATA DETECTED" sx={{ textAlign: 'center', opacity: 0.5 }} /></ListItem>
                )}
              </List>
            </Paper>

            <Accordion sx={{ mt: 2, bgcolor: 'transparent', border: '1px solid rgba(0, 243, 255, 0.2)', color: '#fff', '&:before': { display: 'none' } }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#00f3ff' }} />}
                sx={{ minHeight: '56px' }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'Orbitron', letterSpacing: 1, color: '#00f3ff' }}>REVEAL SPATIAL GRAPH</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, height: '300px' }}>
                <ImpactGraph
                    width={windowSize.width - 32}
                    height={300}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        ) : (
          <ImpactGraph
              width={windowSize.width * 0.9}
              height={windowSize.height * 0.8}
          />
        )}
      </Box>
      <div className="hud-footer">
        <div className="hud-legend">
          <span className="legend-item outcome">OUTCOME</span>
          <span className="legend-item project">PROJECT</span>
          <span className="legend-item task">TASK</span>
        </div>
      </div>
    </div>
  );
};

export default ImpactAtlas;
