import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useSkillData from '../../../hooks/useSkillData';
import * as d3 from 'd3';
import './SkillGalaxyPanel.css';
import theme from '../../../styles/theme';
import { processSkillDataForGalaxy } from '../../../utils/skillUtils';
import SkillDetailPopup from './SkillDetailPopup'; // Import the new popup component

// Helper function to generate pastel colors (can be moved to utils if complex)
const hexToRgb = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return { r, g, b };
};

const getPastelColor = (hexColor, lightnessFactor = 0.8) => {
  const { r, g, b } = hexToRgb(hexColor);
  // Convert to HSL, increase lightness, convert back to RGB then hex
  // For simplicity, we'll just mix with white
  const pr = Math.round((1 - lightnessFactor) * r + lightnessFactor * 255);
  const pg = Math.round((1 - lightnessFactor) * g + lightnessFactor * 255);
  const pb = Math.round((1 - lightnessFactor) * b + lightnessFactor * 255);
  return `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`;
};


const SkillGalaxyPanel = () => {
  const { user, isAuthenticated } = useAuth0();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const [processedSkills, setProcessedSkills] = useState([]); // Holds full processed data
  const [d3Nodes, setD3Nodes] = useState([]);
  const [d3Links, setD3Links] = useState([]);
  const svgRef = useRef(null); 
  const [simulation, setSimulation] = useState(null); 
  const [activeStar, setActiveStar] = useState(null); 
  const [selectedSkillForPopup, setSelectedSkillForPopup] = useState(null);

  // Memoized color functions to prevent unnecessary re-renders if theme object itself doesn't change
  const getStarColor = React.useCallback((level) => {
    if (level >= 15) return theme.colors.secondary; 
    if (level >= 10) return theme.colors.accentGreen; 
    if (level >= 5) return theme.colors.accentOrange; 
    return theme.colors.primary; 
  }, [theme.colors]);

  const getStarGradientUrl = React.useCallback((level) => {
    if (level >= 15) return 'url(#star-gradient-1)'; 
    if (level >= 10) return 'url(#star-gradient-2)'; 
    if (level >= 5) return 'url(#star-gradient-3)'; 
    return 'url(#star-gradient-0)'; 
  }, []); // No direct theme dependency here, but tied to getStarColor logic

  // Helper for pastel colors, also memoized if it were more complex or took theme inputs
  const memoizedGetPastelColor = React.useCallback(getPastelColor, []);
  const getStarColor = (level) => {
    if (level >= 15) return theme.colors.secondary; // e.g., Pink for high levels
    if (level >= 10) return theme.colors.accentGreen; // Green for mid-high
    if (level >= 5) return theme.colors.accentOrange; // Orange for mid
    return theme.colors.primary; // Cyan/Blue for low levels or default
  };
  
  useEffect(() => {
    // ... (data processing logic from previous step remains the same)
    // This sets d3Nodes and d3Links
    if (!skillsLoading && allSkills.length > 0 && isAuthenticated && user?.sub) {
      const userId = user.sub;
      const skillsForGalaxy = processSkillDataForGalaxy(allSkills, userId);
      setProcessedSkills(skillsForGalaxy); // Keep the full processed data

      const nodes = skillsForGalaxy.map(skill => ({
        id: skill.id.toString(),
        name: skill.name,
        category: skill.category,
        level: skill.userLevel,
        experience: skill.userExperience,
        experienceNeeded: skill.experienceNeededForNextLevel,
        levelForColor: skill.levelForColor !== undefined ? skill.levelForColor : (skill.category === 'star' ? 0 : skill.userLevel),
        originalData: skill 
      }));

      const links = [];
      skillsForGalaxy.forEach(skill => {
        if (skill.parent_skill_id) {
          const parentExists = skillsForGalaxy.find(s => s.id === skill.parent_skill_id);
          if (parentExists) {
            links.push({
              source: skill.parent_skill_id.toString(),
              target: skill.id.toString(),
              id: `link-${skill.parent_skill_id}-${skill.id}`
            });
          }
        }
      });
      setD3Nodes(nodes);
      setD3Links(links);
    } else {
      // Clear nodes if not authenticated or no data
      setD3Nodes([]);
      setD3Links([]);
    }
  }, [allSkills, skillsLoading, isAuthenticated, user]);


  useEffect(() => {
    if (d3Nodes.length === 0 || !svgRef.current) {
      if (svgRef.current) d3.select(svgRef.current).selectAll(".everything").remove(); // Clear only the main group
      if(simulation) simulation.stop();
      return;
    }

    const svg = d3.select(svgRef.current);
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));

    // Clear only the main group for re-rendering, keeps defs
    svg.select(".everything").remove(); 

    let defs = svg.select('defs');
    if (defs.empty()) {
        defs = svg.append('defs');
    }
    
    // Define gradients if they don't exist
    const starColorKeys = ['primary', 'secondary', 'accentGreen', 'accentOrange'];
    const starColors = [theme.colors.primary, theme.colors.secondary, theme.colors.accentGreen, theme.colors.accentOrange];
    
    starColors.forEach((color, i) => {
      const gradientId = `star-gradient-${i}`;
      if (defs.select(`#${gradientId}`).empty()) { 
        const gradient = defs.append('radialGradient')
          .attr('id', gradientId)
          .attr('cx', '50%').attr('cy', '50%')
          .attr('r', '50%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', d3.color(color).brighter(0.8).formatHex());
        gradient.append('stop').attr('offset', '50%').attr('stop-color', color);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', d3.color(color).darker(0.5).formatHex());
      }
    });

    const mainGroup = svg.append('g').attr('class', 'everything'); // This is the group that will be transformed by zoom

    // Initial nodes to display: stars, or if a star is active, its children too
    let displayNodes = d3Nodes.filter(n => n.category === 'star');
    let displayLinks = [];

    if (activeStar) {
        const childrenOfActiveStar = d3Nodes.filter(n => n.originalData.parent_skill_id?.toString() === activeStar.id);
        const grandChildrenOfActiveStar = d3Nodes.filter(n => {
            const parentPlanet = childrenOfActiveStar.find(c => c.id === n.originalData.parent_skill_id?.toString());
            return parentPlanet !== undefined;
        });
        // Ensure activeStar itself is part of displayNodes when it's active
        const activeStarNode = d3Nodes.find(n => n.id === activeStar.id);
        if (activeStarNode) {
             displayNodes = Array.from(new Set([activeStarNode, ...childrenOfActiveStar, ...grandChildrenOfActiveStar].filter(Boolean)));
        } else { // Should not happen if activeStar is set from a node in d3Nodes
            displayNodes = Array.from(new Set([...childrenOfActiveStar, ...grandChildrenOfActiveStar].filter(Boolean)));
        }
        
        const activeStarChildrenIds = childrenOfActiveStar.map(n => n.id);
        const grandChildrenIds = grandChildrenOfActiveStar.map(n => n.id);

        displayLinks = d3Links.filter(l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            
            return (sourceId === activeStar.id && activeStarChildrenIds.includes(targetId)) ||
                   (activeStarChildrenIds.includes(sourceId) && grandChildrenIds.includes(targetId));
        });
    }
    
    const currentSim = simulation || d3.forceSimulation();

    currentSim
      .nodes(displayNodes)
      .force('link', d3.forceLink(displayLinks).id(d => d.id).distance(d => d.category === 'moon' ? 30 : (d.category === 'planet' ? 60 : 120)).strength(0.3))
      .force('charge', d3.forceManyBody().strength(d => d.category === 'star' ? -1200 : (d.category === 'planet' ? -350 : -80)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => (d.category === 'star' ? 25 : (d.category === 'planet' ? 15 : 8)) * 1.5 + 5)); // Added some padding
          
    setSimulation(currentSim);

    const link = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(displayLinks, d => d.id) // Use unique link ID if available, otherwise d3 default
      .join('line')
      .attr('stroke', theme.colors.border)
      .attr('stroke-width', 1.5);

    const node = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g.node-group')
      .data(displayNodes, d => d.id)
      .join(
        enter => {
          const group = enter.append('g')
            .attr('class', 'node-group')
            .style('opacity', 0) // Start transparent for fade-in
            .call(g => g.transition().duration(500).style('opacity', 1)); // Fade-in transition

          group.append('circle')
            .attr('r', d => d.category === 'star' ? 25 : (d.category === 'planet' ? 15 : 8))
            .style('fill', d => { 
              if (d.category === 'star') return getStarGradientUrl(d.levelForColor);
              let parentStar = null;
              if (d.category === 'planet') {
                  parentStar = d3Nodes.find(n => n.id === d.originalData.parent_skill_id?.toString() && n.category === 'star');
              } else if (d.category === 'moon') {
                  const parentPlanet = d3Nodes.find(n => n.id === d.originalData.parent_skill_id?.toString() && n.category === 'planet');
                  if (parentPlanet) {
                      parentStar = d3Nodes.find(n => n.id === parentPlanet.originalData.parent_skill_id?.toString() && n.category === 'star');
                  }
              }
              const baseColor = parentStar ? getStarColor(parentStar.levelForColor) : theme.colors.primary;
              return memoizedGetPastelColor(baseColor, d.category === 'planet' ? 0.7 : 0.85);
            }) 
            .on('click', (event, d_clicked) => {
              event.stopPropagation(); 
              if (d_clicked.category === 'star') {
                setActiveStar(prevActiveStar => prevActiveStar?.id === d_clicked.id ? null : d_clicked);
              } else {
               setSelectedSkillForPopup(d_clicked); 
              }
            });

          group.append('text')
            .attr('class', 'node-label')
            .text(d => d.name)
            .attr('dy', d => d.category === 'star' ? -30 : (d.category === 'planet' ? -20 : -12))
            .style('fill', theme.colors.textPrimary)
            .style('font-size', d => d.category === 'star' ? '14px' : '10px')
            .style('text-anchor', 'middle');
            
          return group;
        },
        update => update, 
        exit => exit.transition().duration(300).style('opacity', 0).remove() // Fade-out transition
      );

    currentSim.on('tick', () => { 
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }); 

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => { 
        mainGroup.attr('transform', event.transform);
        const currentZoom = event.transform.k;
        mainGroup.selectAll('.node-label')
          .style('font-size', d => {
            const baseSize = d.category === 'star' ? 14 : 10;
            let newSize = baseSize / currentZoom;
            // Star label legibility: increase min size
            if (d.category === 'star') {
              newSize = Math.max(newSize, baseSize * 0.7); // Min size for stars
            } else {
              newSize = Math.max(newSize, baseSize * 0.5); // Min size for planets/moons
            }
            return newSize + 'px';
          })
          .style('display', currentZoom < 0.25 ? 'none' : 'block'); // Hide labels if very zoomed out
       }); 
    svg.call(zoomBehavior);
    
    currentSim.alpha(0.3).restart();


    return () => { // Cleanup
      currentSim.stop();
    };

  }, [d3Nodes, d3Links, activeStar, simulation, theme.colors, getStarColor, getStarGradientUrl, memoizedGetPastelColor, processedSkills.length]); // Added processedSkills.length for re-evaluation when it changes to 0

  if (skillsLoading) { return <div className="skill-galaxy-panel-loading" style={{color: theme.colors.textSecondary}}>Loading Skill Data...</div>; } 
  if (skillsError) { return <div className="skill-galaxy-panel-error" style={{color: theme.colors.error}}>Error loading skills: {skillsError.message || skillsError.toString()}</div>; } 
  
  // Check after loading and processing, before rendering the main SVG
  if (processedSkills.length === 0 && d3Nodes.length === 0 && !skillsLoading && !skillsError) {
    return (
      <div className="skill-galaxy-panel">
        <h2 style={{ color: theme.colors.textPrimary }}>Skill Constellation</h2>
        <div className="skill-galaxy-empty" style={{color: theme.colors.textSecondary, textAlign: 'center', marginTop: '50px'}}>
          <p>Your Skill Constellation is forming.</p>
          <p>Unlock skills by completing missions or training!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-galaxy-panel" style={{ position: 'relative' }}>
      <h2 style={{ color: theme.colors.textPrimary }}>Skill Constellation</h2>
      <svg className="skill-galaxy-svg" width="100%" height="600px">
        {/* Defs will be appended here by D3 if not present */}
      </svg>
     {selectedSkillForPopup && (
       <SkillDetailPopup 
         skillData={selectedSkillForPopup} 
         onClose={() => setSelectedSkillForPopup(null)} 
       />
     )}
    </div>
  );
};

export default SkillGalaxyPanel;
