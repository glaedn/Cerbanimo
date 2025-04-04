import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './SkillTree.css';
import { useAuth0 } from '@auth0/auth0-react';

const SkillTree = () => {
  const svgRef = useRef();
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [skills, setSkills] = useState([]);
  const gRef = useRef();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [showFullTree, setShowFullTree] = useState(false);
  
  // Dimensions state
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth * 0.9,
    height: window.innerHeight * 0.8
  });

  const userIdRef = useRef(null);

  useEffect(() => {
    const fetchSkills = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const token = await getAccessTokenSilently({
          audience: 'http://localhost:4000',
          scope: 'openid profile email read:profile',
        });

        const profileResponse = await axios.get('http://localhost:4000/profile', {
          params: { 
            sub: user.sub, 
            email: user.email, 
            name: user.name 
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        userIdRef.current = profileResponse.data.id;

        const skillsResponse = await axios.get('http://localhost:4000/skills/all', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const processedSkills = skillsResponse.data.map(skill => {
          let unlockedUsers = skill.unlocked_users || [];
          
          if (typeof unlockedUsers === 'string') {
            try {
              unlockedUsers = JSON.parse(unlockedUsers);
            } catch (e) {
              console.error('Error parsing unlocked_users:', e);
              unlockedUsers = [];
            }
          }
          
          if (!Array.isArray(unlockedUsers)) {
            unlockedUsers = unlockedUsers ? [unlockedUsers] : [];
          }

          const numericUserId = parseInt(userIdRef.current);
          const stringUserId = userIdRef.current.toString();
          
          const userEntry = unlockedUsers.find(userObj => {
            if (!userObj) return false;
            return (
              userObj.user_id === numericUserId ||
              userObj.user_id === stringUserId ||
              String(userObj.user_id) === stringUserId
            );
          });

          const isUnlocked = !!userEntry;
          const userLevel = userEntry?.level ?? 0;
          
          return {
            ...skill,
            unlocked_users: unlockedUsers,
            unlocked: isUnlocked,
            hidden: false, // No more hiding nodes, always show
            userLevel: userLevel
          };
        });

        setSkills(processedSkills);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
    };

    fetchSkills();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  useEffect(() => {
    if (!skills.length) return;
  
    const margin = { top: 60, right: 150, bottom: 60, left: 150 };
    const { width, height } = dimensions;
  
    // Maximum horizontal spacing for connections to prevent too long lines
    const maxHorizontalSpacing = 800; // Set a reasonable max width for connections
    const horizontalSpacing = Math.min(maxHorizontalSpacing, width * 0.8);
  
    const findRootSkills = () => {
      if (showFullTree) {
        return skills.filter(skill => skill.parent_skill_id === null);
      } else {
        // When hiding full tree, only consider roots with unlocked skills in their lineage
        const unlockedSkillIds = skills.filter(skill => skill.unlocked).map(skill => skill.id);
        const rootSkillIds = new Set();
        
        unlockedSkillIds.forEach(skillId => {
          let currentSkill = skills.find(s => s.id === skillId);
          while (currentSkill && currentSkill.parent_skill_id !== null) {
            currentSkill = skills.find(s => s.id === currentSkill.parent_skill_id);
          }
          if (currentSkill) {
            rootSkillIds.add(currentSkill.id);
          }
        });
        
        return skills.filter(skill => rootSkillIds.has(skill.id));
      }
    };
  
    const rootSkills = findRootSkills();
    if (!rootSkills.length) return;
  
    function computeAccumulatedLevels(skillId, allSkills) {
      const skill = allSkills.find(s => s.id === skillId);
      if (!skill) return 0;
      
      const children = allSkills.filter(s => s.parent_skill_id === skillId);
      if (children.length === 0) {
        return skill.userLevel || 0;
      }
      
      return children.reduce((sum, child) => {
        return sum + computeAccumulatedLevels(child.id, allSkills);
      }, 0);
    }
  
    const accumulatedLevels = {};
    rootSkills.forEach(root => {
      accumulatedLevels[root.id] = computeAccumulatedLevels(root.id, skills);
    });

    function computeSubtreeHeight(skill, allSkills) {
      const children = allSkills.filter(s => s.parent_skill_id === skill.id);
      if (children.length === 0) {
        return 1; // Leaf nodes have a height of 1
      }
      return children.reduce((sum, child) => sum + computeSubtreeHeight(child, allSkills), 1);
    }

    const subtreeHeights = {};
    rootSkills.forEach(root => {
      subtreeHeights[root.id] = computeSubtreeHeight(root, skills);
    });
    
    function buildTree(skill, allSkills, depth = 0) {
      const children = allSkills.filter(s => s.parent_skill_id === skill.id);
      
      // Check if this skill or any descendants are unlocked
      const hasUnlockedDescendant = 
        skill.unlocked || 
        children.some(child => 
          child.unlocked || 
          allSkills.some(s => s.parent_skill_id === child.id && s.unlocked)
        );
      
      const isLeafNode = children.length === 0;
      const displayLevel = isLeafNode 
        ? (skill.userLevel || 0) 
        : (accumulatedLevels[skill.id] || 0);
      
      // When not in full tree mode, we'll only include nodes that are unlocked or are needed
      // to connect unlocked nodes to their root
      const shouldIncludeInPartialTree = showFullTree || skill.unlocked || 
        (hasUnlockedDescendant && (depth === 0 || skill.parent_skill_id === null));
      
      // Include only necessary children when in partial tree mode
      const filteredChildren = showFullTree ? children : 
        children.filter(child => 
          child.unlocked || allSkills.some(s => 
            s.parent_skill_id === child.id && s.unlocked
          )
        );
      
      return {
        name: skill.name,
        id: skill.id,
        unlocked: skill.unlocked,
        isRootSkill: depth === 0,
        userLevel: displayLevel,
        hasUnlockedDescendant: hasUnlockedDescendant,
        depth: depth,
        hidden: false, // No more hiding, always show based on showFullTree
        shouldRender: shouldIncludeInPartialTree,
        children: filteredChildren.map(child => buildTree(child, allSkills, depth + 1))
          .filter(node => node.shouldRender || showFullTree),
      };
    }
  
    // Process all nodes
    const allNodes = [];
    const allLinks = [];
    
    // Create hierarchies for each root skill
    const hierarchies = rootSkills.map((rootSkill, index) => {
      const treeData = buildTree(rootSkill, skills);
      
      // Skip empty trees (roots with no unlocked descendants)
      if (!showFullTree && !treeData.shouldRender) {
        return null;
      }
      
      const hierarchy = d3.hierarchy(treeData);
      
      // Apply tree layout to each hierarchy independently
      const treeLayout = d3.tree()
        .size([hierarchy.descendants().length * 40, horizontalSpacing - margin.left - margin.right])
        .separation((a, b) => (a.parent === b.parent ? 2 : 3));
      
      treeLayout(hierarchy);
      
      return hierarchy;
    }).filter(Boolean); // Remove null hierarchies
    
    // Calculate vertical offsets for each tree to prevent overlap
    let currentOffset = margin.top;
    hierarchies.forEach((hierarchy, index) => {
      // Calculate the height of the current tree
      const treeHeight = hierarchy.descendants().length * 40;
      
      // Set absolute vertical position starting from the current offset
      const verticalOffset = currentOffset;
      
      // Apply vertical offset to all nodes in this hierarchy
      hierarchy.descendants().forEach(node => {
        node.x += verticalOffset;
      });
      
      // Update the offset for the next tree
      currentOffset += treeHeight + 200; // 200px gap between trees
    });
    
    // Collect all nodes and links
    hierarchies.forEach(hierarchy => {
      allNodes.push(...hierarchy.descendants());
      allLinks.push(...hierarchy.links());
    });
  
    // Calculate total height needed for all trees
    const totalTreeHeight = currentOffset - 200; // Subtract the last gap
    
    // Calculate appropriate initial position and scale
    const initialX = margin.left;
    const initialY = Math.max(20, (height - totalTreeHeight) / 2);
  
    // Adjust initial scale based on how many trees we have
    const initialScale = Math.max(0.6, Math.min(0.9, width / 1200));
    
    transformRef.current = { 
      x: initialX, 
      y: initialY,
      k: initialScale 
    };
        
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', '100%')
     .attr('height', '100%')
     .attr('viewBox', `0 0 ${width} ${height}`)
     .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add definitions for gradients
    const defs = svg.append('defs');
    
    // Green orb gradient
    const greenGradient = defs.append('radialGradient')
      .attr('id', 'greenOrbGradient')
      .attr('cx', '30%')
      .attr('cy', '30%')
      .attr('r', '70%')
      .attr('fx', '20%')
      .attr('fy', '20%');
    
    greenGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#8FFF8F');
    
    greenGradient.append('stop')
      .attr('offset', '75%')
      .attr('stop-color', '#00AA00');
    
    greenGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#008800');
    
    // Gray socket gradient
    const grayGradient = defs.append('radialGradient')
      .attr('id', 'graySocketGradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '70%');
    
    grayGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#666');
    
    grayGradient.append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#444');
    
    grayGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#222');

    const g = svg.append('g')
      .attr('transform', `translate(${transformRef.current.x},${transformRef.current.y}) scale(${initialScale})`);
    gRef.current = g;
  
    // Create the links between nodes
    g.selectAll('.link')
      .data(allLinks)
      .enter().append('line')
      .attr('class', 'link')
      .attr('x1', d => d.source.y)
      .attr('y1', d => d.source.x)
      .attr('x2', d => d.target.y)
      .attr('y2', d => d.target.x)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2)
      .style('display', d => (showFullTree || (!d.target.data.hidden && !d.source.data.hidden)) ? 'block' : 'none');
  
    // Create node groups
    const node = g.selectAll('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', d => `node ${d.data.isRootSkill ? 'root-node' : ''}`)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('display', d => (showFullTree || !d.data.hidden) ? 'block' : 'none');
      
    // Root node circle size calculation
    function calculateRootNodeSize(d) {
      // Base size for regular nodes
      if (!d.data.isRootSkill) return 15;
      
      // For root nodes, size based on name length and level
      const nameLength = d.data.name.length;
      const levelDigits = d.data.userLevel ? d.data.userLevel.toString().length : 0;
      
      // Adjust size based on name length and level digits
      // Minimum size of 20, with 0.3 additional radius for each character/digit
      return Math.max(20, 20 + (nameLength * 0.3) + (levelDigits * 1));
    }
  
    // Add socket rings for all nodes
    node.append('circle')
      .attr('class', d => d.data.isRootSkill ? 'root-socket' : 'socket')
      .attr('r', d => calculateRootNodeSize(d) + 2)
      .attr('fill', '#222')
      .attr('stroke', '#C3CDD4')
      .attr('stroke-width', 2);
      
    // Add inner circles for nodes with 3D effect
    node.append('circle')
      .attr('class', d => d.data.isRootSkill ? 'root-orb' : 'orb')
      .attr('r', d => calculateRootNodeSize(d))
      .attr('fill', d => {
        if (d.data.isRootSkill) {
          return d.data.hasUnlockedDescendant ? 'url(#greenOrbGradient)' : 'url(#graySocketGradient)';
        } else {
          return d.data.unlocked ? 'url(#greenOrbGradient)' : 'url(#graySocketGradient)';
        }
      })
      .attr('stroke', d => {
        if (d.data.isRootSkill) {
          return d.data.hasUnlockedDescendant ? '#006600' : '#333';
        } else {
          return d.data.unlocked ? '#006600' : '#333';
        }
      })
      .attr('stroke-width', .5);
      
    // Add highlight spot for 3D effect (only for green orbs)
    // Explicitly set stroke to none and stroke-width to 0
    node.filter(d => d.data.unlocked || (d.data.isRootSkill && d.data.hasUnlockedDescendant))
      .append('circle')
      .attr('class', d => d.data.isRootSkill ? 'root-highlight' : 'highlight')
      .attr('r', d => {
        const baseSize = calculateRootNodeSize(d);
        return baseSize / 3; // Highlight is 1/3 the size of the node
      })
      .attr('cx', d => -calculateRootNodeSize(d) * 0.4)
      .attr('cy', d => -calculateRootNodeSize(d) * 0.4)
      .attr('fill', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke', 'none')
      .attr('stroke-width', 0);
  
    // Add level text inside nodes
    node.append('text')
      .attr('class', d => d.data.isRootSkill ? 'root-level-text' : 'level-text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .style('font-size', d => d.data.isRootSkill ? '16px' : '14px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => {
        if (d.data.isRootSkill) {
          return d.data.hasUnlockedDescendant ? d.data.userLevel : '';
        }
        return d.data.unlocked ? d.data.userLevel : '';
      })
      .style('dominant-baseline', 'middle');

    // Create a separate top layer for node labels
    const labelLayer = svg.append('g')
      .attr('class', 'label-layer')
      .attr('transform', `translate(${transformRef.current.x},${transformRef.current.y}) scale(${initialScale})`);
  
    // Add node labels with special handling for root nodes
    labelLayer.selectAll('.node-label')
      .data(allNodes)
      .enter()
      .append('text')
      .attr('class', d => d.data.isRootSkill ? 'root-label' : 'node-label')
      .attr('x', d => d.y + 25)
      .attr('y', d => d.x + 4)
      .text(d => d.data.name)
      .style('fill', 'white')
      .style('font-size', d => d.data.isRootSkill ? '16px' : '12px')
      .style('font-weight', d => d.data.isRootSkill ? 'bold' : 'normal')
      .style('display', d => (showFullTree || !d.data.hidden) ? 'block' : 'none');
  
    // Define min and max sizes for root nodes during zoom
    const MIN_ROOT_SIZE_MULTIPLIER = 0.6; // At max zoom out, node won't get smaller than 60% of original
    const MAX_ROOT_SIZE_MULTIPLIER = 3.5; // At max zoom in, node won't get larger than 150% of original
    const MIN_ROOT_LABEL_SIZE = 12; // Minimum font size for root labels
    const MAX_ROOT_LABEL_SIZE = 72; // Maximum font size for root labels
  
    // Update zoom configuration with constraints on node scaling
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        // Update both the main layer and the label layer
        g.attr('transform', event.transform);
        labelLayer.attr('transform', event.transform);
        
        // Store the current transform for reference
        transformRef.current = { 
          x: event.transform.x, 
          y: event.transform.y,
          k: event.transform.k
        };
        
        // Calculate size adjustment factor with constraints
        const sizeAdjustFactor = Math.min(
          MAX_ROOT_SIZE_MULTIPLIER, 
          Math.max(MIN_ROOT_SIZE_MULTIPLIER, 1 / event.transform.k)
        );
        
        // Calculate font size adjustment with constraints
        const fontSizeAdjust = Math.min(
          MAX_ROOT_LABEL_SIZE, 
          Math.max(MIN_ROOT_LABEL_SIZE, 16 / event.transform.k)
        );
        
        // Adjust root node text size based on zoom level with constraints
        labelLayer.selectAll('.root-label')
          .style('font-size', `${fontSizeAdjust}px`);
          
        // Adjust root orb size based on zoom level with constraints
        g.selectAll('.root-orb')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            // Apply constrained inverse zoom scaling
            return baseSize * sizeAdjustFactor;
          });
          
        // Adjust root socket size based on zoom level with constraints
        g.selectAll('.root-socket')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            // Apply constrained inverse zoom scaling
            return (baseSize + 2) * sizeAdjustFactor;
          });
          
        // Adjust root highlight size and position based on zoom level with constraints
        g.selectAll('.root-highlight')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            // Apply constrained inverse zoom scaling
            return (baseSize / 3) * sizeAdjustFactor;
          })
          .attr('cx', d => {
            const baseSize = calculateRootNodeSize(d);
            // Apply constrained inverse zoom scaling
            return (-baseSize * 0.4) * sizeAdjustFactor;
          })
          .attr('cy', d => {
            const baseSize = calculateRootNodeSize(d);
            // Apply constrained inverse zoom scaling
            return (-baseSize * 0.4) * sizeAdjustFactor;
          });
          
        // Adjust root level text size based on zoom level with constraints
        g.selectAll('.root-level-text')
          .style('font-size', `${fontSizeAdjust}px`);
      });

    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity
        .translate(initialX, initialY)
        .scale(initialScale));
  
    // Add visual indicators for tree separation
    hierarchies.forEach((hierarchy, index) => {
      if (index > 0) {
        const prevTree = hierarchies[index - 1];
        const currentTree = hierarchy;
        
        // Find the lowest node of the previous tree
        const lowestPrevNode = prevTree.descendants()
          .reduce((lowest, node) => node.x > lowest.x ? node : lowest, prevTree);
        
        // Find the highest node of the current tree
        const highestCurrentNode = currentTree.descendants()
          .reduce((highest, node) => node.x < highest.x ? node : highest, currentTree);
        
        // Calculate the midpoint between trees
        const midpointY = (lowestPrevNode.x + highestCurrentNode.x) / 2;
        
        // Add a subtle indicator line
        g.append('line')
          .attr('class', 'tree-separator')
          .attr('x1', 0)
          .attr('y1', midpointY)
          .attr('x2', 50) // Short line
          .attr('y2', midpointY)
          .attr('stroke', '#444')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      }
    });
    
  }, [skills, dimensions, showFullTree]);

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth * 0.9,
        height: window.innerHeight * 0.8
      });
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const toggleFullTree = () => {
    setShowFullTree(!showFullTree);
  };
  
  return (
    <div className='treepage' style={{ width: '100%', height: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Skill Tree</h2>
        <button 
          onClick={toggleFullTree}
          style={{
            marginRight: '60px',
            padding: '8px 16px',
            backgroundColor: showFullTree ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {showFullTree ? 'Hide Full Tree' : 'Show Full Tree'}
        </button>
      </div>
      <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </div>
    </div>
  );
};

export default SkillTree;