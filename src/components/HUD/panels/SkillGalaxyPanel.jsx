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
  const fixedStarPositionsRef = useRef(new Map()); // For persisting star fx/fy values
  const initialZoomAppliedRef = useRef(false); // To track if initial overview zoom is applied
  const [forceDataUpdate, setForceDataUpdate] = useState(false); // To trigger data reprocessing
  const [selectedSkillForPopup, setSelectedSkillForPopup] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef(null);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  const getStarColor = React.useCallback((level) => {
    if (level >= 20) return theme.colors.accentPurple || '#800080'; // Purple for 20+
    if (level >= 10) return theme.colors.secondary; // Pink for 10-19 (assuming secondary is pink)
    if (level >= 5) return theme.colors.accentGreen; // Green for 5-9
    // For levels 1-4, use primary. If level 0 should have a different default, adjust.
    // Assuming level 0 means "not achieved enough for distinct color" or "base color".
    // If skills only show color from level 1:
    if (level >= 1) return theme.colors.primary; // Blue for 1-4
    return theme.colors.primary; // Default for level 0 or uncolored
  }, [theme.colors]);

  const getStarGradientUrl = React.useCallback((level) => {
    if (level >= 20) return 'url(#star-gradient-3)'; // Corresponds to accentPurple
    if (level >= 10) return 'url(#star-gradient-2)'; // Corresponds to secondary (pink)
    if (level >= 5) return 'url(#star-gradient-1)';  // Corresponds to accentGreen
    if (level >= 1) return 'url(#star-gradient-0)';  // Corresponds to primary (blue)
    return 'url(#star-gradient-0)'; // Default for level 0 or uncolored
  }, []); // No theme dependencies needed here as it maps to fixed IDs

  const memoizedGetPastelColor = React.useCallback(getPastelColor, []);

  useEffect(() => {

    if (!skillsLoading && allSkills && allSkills.length > 0 && isAuthenticated && user?.sub) {
      const userId = profile?.id || user.sub; // Fallback to user.sub if profile.id not available

      const skillsForGalaxy = processSkillDataForGalaxy(allSkills, userId);
      // setProcessedSkills(skillsForGalaxy); // Not strictly needed as state if d3Nodes is derived correctly

      // Filter out skills with null or undefined IDs before mapping
      const validSkillsForGalaxy = skillsForGalaxy.filter(skill => {
        if (skill && skill.id != null) { // Check for null or undefined ID
          return true;
        }
        console.warn('[D3 Data Prep] Filtered out skill due to missing/null ID:', skill);
        return false;
      });
      
      if (validSkillsForGalaxy.length !== skillsForGalaxy.length) {
        console.warn(`[D3 Data Prep] Original skillsForGalaxy count: ${skillsForGalaxy.length}, Valid count after ID filter: ${validSkillsForGalaxy.length}`);
      }

      // When creating new nodes, apply fx/fy from fixedStarPositionsRef for stars
      const newNodes = validSkillsForGalaxy.map(skill => {
        let fx = null, fy = null;
        if (skill.category === 'star') {
          const fixedPos = fixedStarPositionsRef.current.get(skill.id.toString()); // ID is now guaranteed non-null
          if (fixedPos) {
            fx = fixedPos.fx;
            fy = fixedPos.fy;
          }
        }
        return {
          id: skill.id.toString(), // skill.id is non-null here
          name: skill.name || "Unnamed Skill", // Fallback for name
          parent: skill.parent_skill_id ? skill.parent_skill_id.toString() : null,
          level: skill.userLevel,
          userLevel: skill.userLevel, // Ensure userLevel is present for level text display
          experience: skill.userExperience,
          experienceNeeded: skill.experienceNeededForNextLevel,
          levelForColor: skill.levelForColor !== undefined ? skill.levelForColor : (skill.category === 'star' ? 0 : skill.userLevel),
          category: skill.category || 'star', // Make sure category is set
          originalData: skill,
          fx, // Apply stored fixed position
          fy, // Apply stored fixed position
        };
      });

      const newLinks = [];
      skillsForGalaxy.forEach(skill => {
        if (skill.parent_skill_id) {
          const parentExists = skillsForGalaxy.find(s => s.id === skill.parent_skill_id); // Check against current skillsForGalaxy
          if (parentExists) {
            newLinks.push({
              source: skill.parent_skill_id.toString(),
              target: skill.id.toString(),
              id: `link-${skill.parent_skill_id}-${skill.id}`
            });
          }
        }
      });

      setD3Nodes(newNodes);
      setD3Links(newLinks);
      // Update processedSkills state if other parts of the component rely on it directly
      // For now, assuming d3Nodes is the primary derived state for rendering the galaxy
      setProcessedSkills(skillsForGalaxy); 


    } else {
      console.log('Clearing nodes - conditions not met');
      // Clear nodes and links if they exist
      if (d3Nodes.length > 0) setD3Nodes([]);
      if (d3Links.length > 0) setD3Links([]);
      if (processedSkills.length > 0) setProcessedSkills([]);
    }
  }, [allSkills, skillsLoading, isAuthenticated, user, profile, forceDataUpdate]); // Removed activeStar from dependencies

  useEffect(() => {

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

    // Set SVG dimensions explicitly
    svg.attr('width', width).attr('height', height);

    // Clear only the main group for re-rendering, keeps defs
    svg.select(".everything").remove();

    let defs = svg.select('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
    }

    // Define gradients
    // const starColors = [theme.colors.primary, theme.colors.secondary, theme.colors.accentGreen, theme.colors.accentOrange]; // OLD
    const newStarColors = [
      theme.colors.primary,    // For levels 1-4 (index 0)
      theme.colors.accentGreen, // For levels 5-9 (index 1)
      theme.colors.secondary,   // For levels 10-19 (index 2)
      theme.colors.accentPurple || '#800080' // For levels 20+ (index 3)
    ];
    
    newStarColors.forEach((color, i) => {
      const gradientId = `star-gradient-${i}`;
      if (defs.select(`#${gradientId}`).empty()) {
        const gradient = defs.append('radialGradient')
          .attr('id', gradientId)
          .attr('cx', '50%') // Center of the gradient
          .attr('cy', '50%')
          .attr('r', '50%') // Radius of the gradient, relative to the circle it's applied to
          .attr('fx', '40%') // Focal point X (shifted from cx for a highlight effect)
          .attr('fy', '40%'); // Focal point Y (shifted from cy for a highlight effect)

        // Define more contrasted stops for a pronounced effect
        gradient.append('stop')
          .attr('offset', '0%') // Innermost part of the gradient (focal point)
          .attr('stop-color', d3.color(color).brighter(1.8).formatHex()); // Very bright highlight

        gradient.append('stop')
          .attr('offset', '25%') // Transition from highlight to a slightly brighter base
          .attr('stop-color', d3.color(color).brighter(0.7).formatHex());
        
        gradient.append('stop')
          .attr('offset', '50%') // Base color
          .attr('stop-color', color);

        gradient.append('stop')
          .attr('offset', '100%') // Outermost part of the gradient
          .attr('stop-color', d3.color(color).darker(0.8).formatHex()); // Darker edge for depth
      }
    });

    const mainGroup = svg.append('g').attr('class', 'everything');

    // Always display all nodes and links from d3Nodes and d3Links
    const displayNodes = d3Nodes;
    const displayLinks = d3Links;

    if(displayNodes.length < 15 && displayNodes.length > 0) { // Log details if few nodes, but not if zero
        console.log('Final display nodes (details):', displayNodes.map(n => ({id: n.id, name: n.name, category: n.category, fx: n.fx, parent: n.parent })));
        console.log('Final display links (details):', displayLinks.map(l => ({source: l.source.id || l.source, target: l.target.id || l.target})));
    }

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
      .attr('stroke-width', 1.5)
      .style('stroke-opacity', 0.6); // Set initial link opacity

    // Add nodes
    if (displayNodes.length > 0) {
      // Check for missing IDs, which is critical for the data join
      const nodesWithMissingIds = displayNodes.filter(n => n.id === undefined || n.id === null);
      if (nodesWithMissingIds.length > 0) {
        console.error(`[D3 Debug] ${nodesWithMissingIds.length} nodes have missing IDs! Example:`, nodesWithMissingIds[0]);
      }
    }
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
              // Add 'satellite' category with a smaller radius
              const radius = category === 'star' ? 25 : (category === 'planet' ? 15 : (category === 'moon' ? 8 : 5)); // Added satellite radius
              return radius;
            })
            .style('fill', d => {
              const category = d.category || 'star';
              let fillColor;

              // All categories will now use gradients based on their respective levels.
              // Stars use 'levelForColor' (aggregated from children).
              // Dependencies use their own 'userLevel'.
              const levelForColoring = (category === 'star') ? (d.levelForColor || 0) : (d.userLevel || 0);

              fillColor = getStarGradientUrl(levelForColoring); // Use gradients for all

              if (!fillColor || fillColor === "none") {
                console.error(`[D3 Debug] Invalid fill for node ${d.id} (${d.name}, category: ${category}): ${fillColor}. Defaulting to primary gradient.`);
                fillColor = getStarGradientUrl(0); // Default to base gradient
              }
              return fillColor;
            })
            .style('stroke', theme.colors.border || '#666')
            .style('stroke-width', 1)
            .on('click', (event, d_clicked) => {
              event.stopPropagation();
              // All nodes, including stars, will now open the popup
              setSelectedSkillForPopup(d_clicked);
            });

          group.append('text')
            .attr('class', 'node-label')
            .text(d => d.name)
            .attr('dy', d => {
              const category = d.category || 'star';
              // Adjust dy for satellites
              return category === 'star' ? -30 : (category === 'planet' ? -20 : (category === 'moon' ? -12 : -9)); // Added satellite dy
            })
            .style('fill', theme.colors.textPrimary || '#fff')
            .style('font-size', d => {
              const category = d.category || 'star';
              return category === 'star' ? '14px' : '10px';
            })
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none'); // Prevent text from interfering with clicks
          
          // Add level text for stars, planets, and moons
          group.filter(d => 
            (d.category === 'star' && d.levelForColor > 0) ||
            ((d.category === 'planet' || d.category === 'moon' || d.category === 'satellite') && d.userLevel > 0) // Added satellite
          )
            .append('text')
            .attr('class', 'level-label')
            .text(d => {
              if (d.category === 'star') return `Lvl ${d.levelForColor}`;
              return `Lvl ${d.userLevel}`;
            })
            .attr('dy', d => {
              if (d.category === 'star') return 25 + 10;
              if (d.category === 'planet') return 15 + 10;
              if (d.category === 'moon') return 8 + 10;
              return 5 + 8; // Satellite radius (5) + padding for level label
            });
            // Styling is handled by .level-label class in SkillGalaxyPanel.css

          group.on('mouseenter', function(event, d_hovered) {
            // 'this' refers to the G element hovered
            const allLinks = mainGroup.selectAll('.links line');
            const allNodes = mainGroup.selectAll('.nodes .node-group'); // Get all node groups

            // Get all IDs in the constellation of the hovered node
            const constellationIds = new Set();
            const getConstellationIds = (nodeId) => {
              const currentNode = d3Nodes.find(n => n.id === nodeId);
              if (!currentNode || constellationIds.has(nodeId)) return;
              constellationIds.add(nodeId);

              // Add parent
              if (currentNode.parent) { // Assuming parent stores ID string
                getConstellationIds(currentNode.parent);
              }
              // Add children (need to find them from d3Nodes based on parent_skill_id)
              d3Nodes.forEach(n => {
                if (n.parent === nodeId) {
                  getConstellationIds(n.id);
                }
              });
            };

            getConstellationIds(d_hovered.id);

            // Style links
            allLinks.style('stroke', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 'white' : (theme.colors.border || '#666');
              })
              .style('stroke-width', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 3 : 1.5;
              })
              .style('stroke-opacity', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 1 : 0.6;
              });

            // Optionally, style nodes (e.g., make non-constellation nodes less prominent)
            allNodes.style('opacity', n_data => constellationIds.has(n_data.id) ? 1 : 0.3);

          })
          .on('mouseleave', function(event, d_hovered) {
            mainGroup.selectAll('.links line')
              .style('stroke', theme.colors.border || '#666')
              .style('stroke-width', 1.5)
              .style('stroke-opacity', 0.6); // Default stroke opacity for links

            mainGroup.selectAll('.nodes .node-group').style('opacity', 1);
          });

          return group;
        },
        update => {
          // Ensure level text is updated if data changes
          update.selectAll('.level-label')
            .filter(d => 
              (d.category === 'star' && d.levelForColor > 0) ||
              ((d.category === 'planet' || d.category === 'moon' || d.category === 'satellite') && d.userLevel > 0) // Added satellite
            )
            .text(d => {
              if (d.category === 'star') return `Lvl ${d.levelForColor}`;
              return `Lvl ${d.userLevel}`;
            })
            .attr('dy', d => { // Also update dy in case category could change (unlikely here but good practice)
              if (d.category === 'star') return 25 + 10;
              if (d.category === 'planet') return 15 + 10;
              if (d.category === 'moon') return 8 + 10;
              return 5 + 8; // Satellite radius (5) + padding
            });

          // Also attach hover handlers to updated nodes
          update.on('mouseenter', function(event, d_hovered) {
            // 'this' refers to the G element hovered
            const allLinks = mainGroup.selectAll('.links line');
            const allNodes = mainGroup.selectAll('.nodes .node-group');

            const constellationIds = new Set();
            const getConstellationIds = (nodeId) => {
              const currentNode = d3Nodes.find(n => n.id === nodeId);
              if (!currentNode || constellationIds.has(nodeId)) return;
              constellationIds.add(nodeId);
              if (currentNode.parent) getConstellationIds(currentNode.parent);
              d3Nodes.forEach(n => {
                if (n.parent === nodeId) getConstellationIds(n.id);
              });
            };
            getConstellationIds(d_hovered.id);

            allLinks.style('stroke', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 'white' : (theme.colors.border || '#666');
              })
              .style('stroke-width', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 3 : 1.5;
              })
              .style('stroke-opacity', l => {
                const sourceInConstellation = constellationIds.has(l.source.id || l.source);
                const targetInConstellation = constellationIds.has(l.target.id || l.target);
                return (sourceInConstellation && targetInConstellation) ? 1 : 0.6;
              });
            allNodes.style('opacity', n_data => constellationIds.has(n_data.id) ? 1 : 0.3);
          })
          .on('mouseleave', function(event, d_hovered) {
            mainGroup.selectAll('.links line')
              .style('stroke', theme.colors.border || '#666')
              .style('stroke-width', 1.5)
              .style('stroke-opacity', 0.6);
            mainGroup.selectAll('.nodes .node-group').style('opacity', 1);
          });
          return update;
        },
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
    
    // Define zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 5]) // Allow more zoom out
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        const currentZoom = event.transform.k;
        mainGroup.selectAll('.node-label, .level-label')
          .style('font-size', function(d) { 
            const isLevelLabel = d3.select(this).classed('level-label');
            let baseSize = isLevelLabel ? 9 : (d.category === 'star' ? 14 : 10);
            let newSize = baseSize / currentZoom;
            if (isLevelLabel) newSize = Math.max(newSize, baseSize * 0.4);
            else if (d.category === 'star') newSize = Math.max(newSize, baseSize * 0.7);
            else newSize = Math.max(newSize, baseSize * 0.5);
            return newSize + 'px';
          })
          .style('display', function(d) { // MODIFIED PART
            // const currentZoom = event.transform.k; // currentZoom is already defined in the outer scope
            if (d.category === 'star') {
              // Star labels should be visible longer when zooming out.
              // Hide star labels if currentZoom is less than 0.125 (more zoomed out)
              return currentZoom < 0.125 ? 'none' : 'block';
            } else { // For planets, moons, and satellites
              // Other labels should require more zooming in to be visible.
              // Hide other labels if currentZoom is less than 0.5
              return currentZoom < 0.5 ? 'none' : 'block';
            }
          });
      });
    svg.call(zoomBehavior); // Initialize zoom behavior on the SVG element

    // Handle initial zoom and star fixing when simulation ends
    currentSim.on('end.fixStars', () => {
      const svgWidth = parseFloat(svg.attr('width'));
      const svgHeight = parseFloat(svg.attr('height'));

      if (!initialZoomAppliedRef.current) {
        if (displayNodes.length > 0) {
          const starNodesData = displayNodes.filter(d => d.category === 'star');
          if (starNodesData.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            starNodesData.forEach(d => {
              if (d.x < minX) minX = d.x;
              if (d.x > maxX) maxX = d.x;
              if (d.y < minY) minY = d.y;
              if (d.y > maxY) maxY = d.y;
            });

            const dataWidth = maxX - minX;
            const dataHeight = maxY - minY;
            const padding = 80; 

            let k = 0.75; // Default scale if calculation is tricky (e.g. single node)
            let tx = svgWidth / 2;
            let ty = svgHeight / 2;

            if (dataWidth > 0 && dataHeight > 0) { // Multiple stars with spread
                const scaleX = (svgWidth - padding * 2) / dataWidth;
                const scaleY = (svgHeight - padding * 2) / dataHeight;
                k = Math.min(scaleX, scaleY, 1); // Cap at 1, allow zoom out more (e.g. min of 0.2)
                 k = Math.max(k, 0.2); // ensure not too zoomed out if graph is tiny

                const midX = minX + dataWidth / 2;
                const midY = minY + dataHeight / 2;
                tx = svgWidth / 2 - k * midX;
                ty = svgHeight / 2 - k * midY;
            } else if (starNodesData.length === 1) { // Single star
                tx = svgWidth / 2 - k * starNodesData[0].x;
                ty = svgHeight / 2 - k * starNodesData[0].y;
            }
            // If dataWidth or dataHeight is 0 (e.g. all stars in a line, or single star), k might need adjustment or use default
            
            const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
            svg.transition().duration(750).call(zoomBehavior.transform, initialTransform);
          } else {
             svg.call(zoomBehavior.transform, d3.zoomIdentity);
          }
        } else {
           svg.call(zoomBehavior.transform, d3.zoomIdentity);
        }
        initialZoomAppliedRef.current = true;
      }

      // Fix star positions after initial zoom has been determined/applied
      let refActuallyUpdated = false;
      const tolerance = 0.001;
      displayNodes.forEach(dNode => {
        if (dNode.category === 'star') {
          const currentFixedPos = fixedStarPositionsRef.current.get(dNode.id);
          if (!currentFixedPos || Math.abs(currentFixedPos.fx - dNode.x) > tolerance || Math.abs(currentFixedPos.fy - dNode.y) > tolerance) {
            fixedStarPositionsRef.current.set(dNode.id, { fx: dNode.x, fy: dNode.y });
            refActuallyUpdated = true;
          }
          dNode.fx = dNode.x;
          dNode.fy = dNode.y;
        }
      });

      if (refActuallyUpdated) {
        console.log("Forcing data update due to fixedStarPositionsRef update after initial zoom/fix.");
        setForceDataUpdate(prev => !prev);
      }
    });
        
    // Start simulation
    currentSim.alpha(0.3).restart();

    return () => {
      currentSim.stop();
      currentSim.on('end.fixStars', null); // Clean up the specific event listener
    };
    // Removed setD3Nodes from deps. Added fixedStarPositionsRef (though as a ref, it doesn't trigger updates itself).
    // Key dependencies are d3Nodes, d3Links, and simulation. activeStar removed.
  }, [d3Nodes, d3Links, simulation, theme.colors, getStarColor, getStarGradientUrl, memoizedGetPastelColor, fixedStarPositionsRef, setForceDataUpdate]);

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