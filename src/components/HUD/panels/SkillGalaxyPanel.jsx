import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import useSkillData from '../../../hooks/useSkillData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import * as d3 from 'd3';
import './SkillGalaxyPanel.css';
import '../HUDPanel.css';
import theme from '../../../styles/theme';
import { processSkillDataForGalaxy } from '../../../utils/skillUtils';
import SkillDetailPopup from './SkillDetailPopup';

// Helper function to generate pastel colors
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
  const pr = Math.round((1 - lightnessFactor) * r + lightnessFactor * 255);
  const pg = Math.round((1 - lightnessFactor) * g + lightnessFactor * 255);
  const pb = Math.round((1 - lightnessFactor) * b + lightnessFactor * 255);
  return `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`;
};

const SkillGalaxyPanel = () => {
  const { user, isAuthenticated } = useAuth0();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const { profile } = useUserProfile();
  const [processedSkills, setProcessedSkills] = useState([]);
  const [d3Nodes, setD3Nodes] = useState([]);
  const [d3Links, setD3Links] = useState([]);
  const svgRef = useRef(null);
  const [simulation, setSimulation] = useState(null);
  const [activeStar, setActiveStar] = useState(null);
  const [selectedSkillForPopup, setSelectedSkillForPopup] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef(null);
  // Add debug logging
  console.log('SkillGalaxyPanel render:', {
    skillsLoading,
    skillsError,
    allSkillsLength: allSkills?.length,
    processedSkillsLength: processedSkills?.length,
    d3NodesLength: d3Nodes?.length,
    isAuthenticated,
    userId: user?.sub,
    profileId: profile?.id
  });

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

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
  }, []);

  const memoizedGetPastelColor = React.useCallback(getPastelColor, []);

  useEffect(() => {
    console.log('Data processing effect triggered:', {
      skillsLoading,
      allSkillsLength: allSkills?.length,
      isAuthenticated,
      userSub: user?.sub,
      profileId: profile?.id
    });

    if (!skillsLoading && allSkills && allSkills.length > 0 && isAuthenticated && user?.sub) {
      const userId = profile?.id || user.sub; // Fallback to user.sub if profile.id not available
      console.log('Processing skills for userId:', userId);
      
      const skillsForGalaxy = processSkillDataForGalaxy(allSkills, userId);
      setProcessedSkills(skillsForGalaxy);
      console.log("Processed skills for galaxy:", skillsForGalaxy);

      const nodes = skillsForGalaxy.map(skill => ({
        id: skill.id.toString(),
        name: skill.name,
        parent: skill.parent_skill_id ? skill.parent_skill_id.toString() : null,
        level: skill.userLevel,
        experience: skill.userExperience,
        experienceNeeded: skill.experienceNeededForNextLevel,
        levelForColor: skill.levelForColor !== undefined ? skill.levelForColor : (skill.category === 'star' ? 0 : skill.userLevel),
        category: skill.category || 'star', // Make sure category is set
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

      console.log('Created nodes:', nodes);
      console.log('Created links:', links);
      
      setD3Nodes(nodes);
      setD3Links(links);
    } else {
      console.log('Clearing nodes - conditions not met');
      setD3Nodes([]);
      setD3Links([]);
      setProcessedSkills([]);
    }
  }, [allSkills, skillsLoading, isAuthenticated, user, profile]);

  useEffect(() => {
    console.log('D3 rendering effect triggered:', {
      d3NodesLength: d3Nodes?.length,
      svgRefCurrent: !!svgRef.current
    });

    if (d3Nodes.length === 0 || !svgRef.current) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll(".everything").remove();
      }
      if (simulation) {
        simulation.stop();
      }
      return;
    }

    const svg = d3.select(svgRef.current);
    
    // Get the actual container dimensions
    const container = svgRef.current.parentElement;
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = containerRect.height || 600;
    
    console.log('SVG dimensions:', { width, height });
    
    // Set SVG dimensions explicitly
    svg.attr('width', width).attr('height', height);

    // Clear only the main group for re-rendering, keeps defs
    svg.select(".everything").remove();

    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
    }

    // Define gradients
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

    const mainGroup = svg.append('g').attr('class', 'everything');

    // Filter nodes to display
    let displayNodes = d3Nodes.filter(n => n.category === 'star' || !n.category); // Include nodes without category as stars
    let displayLinks = [];

    console.log('Display nodes (stars only):', displayNodes);

    if (activeStar) {
      const childrenOfActiveStar = d3Nodes.filter(n => n.originalData.parent_skill_id?.toString() === activeStar.id);
      const grandChildrenOfActiveStar = d3Nodes.filter(n => {
        const parentPlanet = childrenOfActiveStar.find(c => c.id === n.originalData.parent_skill_id?.toString());
        return parentPlanet !== undefined;
      });
      
      const activeStarNode = d3Nodes.find(n => n.id === activeStar.id);
      if (activeStarNode) {
        displayNodes = Array.from(new Set([activeStarNode, ...childrenOfActiveStar, ...grandChildrenOfActiveStar].filter(Boolean)));
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

    console.log('Final display nodes:', displayNodes);
    console.log('Final display links:', displayLinks);

    // Create or update simulation
    const currentSim = simulation || d3.forceSimulation();

    currentSim
      .nodes(displayNodes)
      .force('link', d3.forceLink(displayLinks).id(d => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(30));

    setSimulation(currentSim);

    // Add links
    const link = mainGroup.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(displayLinks, d => d.id)
      .join('line')
      .attr('stroke', theme.colors.border || '#666')
      .attr('stroke-width', 1.5);

    // Add nodes
    const node = mainGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g.node-group')
      .data(displayNodes, d => d.id)
      .join(
        enter => {
          const group = enter.append('g')
            .attr('class', 'node-group')
            .style('opacity', 0)
            .call(g => g.transition().duration(500).style('opacity', 1));

          group.append('circle')
            .attr('r', d => {
              const category = d.category || 'star';
              return category === 'star' ? 25 : (category === 'planet' ? 15 : 8);
            })
            .style('fill', d => {
              const category = d.category || 'star';
              if (category === 'star') return getStarGradientUrl(d.levelForColor);
              
              let parentStar = null;
              if (category === 'planet') {
                parentStar = d3Nodes.find(n => n.id === d.originalData.parent_skill_id?.toString() && (n.category === 'star' || !n.category));
              } else if (category === 'moon') {
                const parentPlanet = d3Nodes.find(n => n.id === d.originalData.parent_skill_id?.toString() && n.category === 'planet');
                if (parentPlanet) {
                  parentStar = d3Nodes.find(n => n.id === parentPlanet.originalData.parent_skill_id?.toString() && (n.category === 'star' || !n.category));
                }
              }
              const baseColor = parentStar ? getStarColor(parentStar.levelForColor) : theme.colors.primary;
              return memoizedGetPastelColor(baseColor, category === 'planet' ? 0.7 : 0.85);
            })
            .style('stroke', theme.colors.border || '#666')
            .style('stroke-width', 1)
            .on('click', (event, d_clicked) => {
              event.stopPropagation();
              const category = d_clicked.category || 'star';
              if (category === 'star') {
                setActiveStar(prevActiveStar => prevActiveStar?.id === d_clicked.id ? null : d_clicked);
              } else {
                setSelectedSkillForPopup(d_clicked);
              }
            });

          group.append('text')
            .attr('class', 'node-label')
            .text(d => d.name)
            .attr('dy', d => {
              const category = d.category || 'star';
              return category === 'star' ? -30 : (category === 'planet' ? -20 : -12);
            })
            .style('fill', theme.colors.textPrimary || '#fff')
            .style('font-size', d => {
              const category = d.category || 'star';
              return category === 'star' ? '14px' : '10px';
            })
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none'); // Prevent text from interfering with clicks

          return group;
        },
        update => update,
        exit => exit.transition().duration(300).style('opacity', 0).remove()
      );

    // Add tick function
    currentSim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        const currentZoom = event.transform.k;
        mainGroup.selectAll('.node-label')
          .style('font-size', d => {
            const category = d.category || 'star';
            const baseSize = category === 'star' ? 14 : 10;
            let newSize = baseSize / currentZoom;
            if (category === 'star') {
              newSize = Math.max(newSize, baseSize * 0.7);
            } else {
              newSize = Math.max(newSize, baseSize * 0.5);
            }
            return newSize + 'px';
          })
          .style('display', currentZoom < 0.25 ? 'none' : 'block');
      });
    
    svg.call(zoomBehavior);
    
    // Start simulation
    currentSim.alpha(0.3).restart();

    return () => {
      currentSim.stop();
    };

  }, [d3Nodes, d3Links, activeStar, simulation, theme.colors, getStarColor, getStarGradientUrl, memoizedGetPastelColor]);

  if (skillsLoading) {
    return (
      <div className="skill-galaxy-panel-loading" style={{color: theme.colors.textSecondary}}>
        Loading Skill Data...
      </div>
    );
  }
  
  if (skillsError) {
    return (
      <div className="skill-galaxy-panel-error" style={{color: theme.colors.error}}>
        Error loading skills: {skillsError.message || skillsError.toString()}
      </div>
    );
  }

  if (processedSkills.length === 0 && d3Nodes.length === 0 && !skillsLoading && !skillsError) {
    return (
      <div className={`hud-panel skill-galaxy-panel ${isMinimized ? 'minimized' : ''}`}>
        <h2 style={{ color: theme.colors.textPrimary }}>Skill Constellations</h2>
        <div className="skill-galaxy-empty" style={{color: theme.colors.textSecondary, textAlign: 'center', marginTop: '50px'}}>
          <p>Your Skill Constellation is forming.</p>
          <p>Unlock skills by completing missions or training!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
    ref={panelRef}
    className={`hud-panel skill-galaxy-panel ${isMinimized ? 'minimized' : ''}`}>
       <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Skill Constellations</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Skill Constellations" : "Minimize Skill Constellations"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      <div style={{ width: '100%', height: '500px', minHeight: '400px' }}>
        <svg 
          ref={svgRef} 
          className="skill-galaxy-svg" 
          style={{ 
            width: '100%', 
            height: '100%',
            backgroundColor: theme.colors.background || 'transparent',
            border: '1px solid ' + (theme.colors.border || '#666')
          }}
        >
          {/* Defs will be appended here by D3 */}
        </svg>
      </div>
      {selectedSkillForPopup && (
        <SkillDetailPopup 
          skillData={selectedSkillForPopup} 
          onClose={() => setSelectedSkillForPopup(null)}
          parentRef ={panelRef} 
        />
      )}
    </div>
  );
};

export default SkillGalaxyPanel;