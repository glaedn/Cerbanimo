import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './SkillTree.css';
import { useAuth0 } from '@auth0/auth0-react';

const SkillTree = () => {
  const svgRef = useRef();
  const transformRef = useRef({ x: 0, y: 0 });
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
            hidden: !showFullTree,
            userLevel: userLevel
          };
        });

        setSkills(processedSkills);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
    };

    fetchSkills();
  }, [isAuthenticated, user, getAccessTokenSilently, showFullTree]);

  useEffect(() => {
    if (!skills.length) return;
  
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };
    const { width, height } = dimensions;
  
    // Significantly increased horizontal spacing to prevent text overlap
    const horizontalSpacing = Math.max(1200, width * 1.5);
  
    const findRootSkills = () => {
      if (showFullTree) {
        return skills.filter(skill => skill.parent_skill_id === null);
      } else {
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
      
      return {
        name: skill.name,
        id: skill.id,
        unlocked: skill.unlocked,
        isRootSkill: depth === 0,
        userLevel: displayLevel,
        hasUnlockedDescendant: hasUnlockedDescendant,
        depth: depth,
        hidden: showFullTree ? false : depth > 0,
        children: children.map(child => buildTree(child, allSkills, depth + 1)),
      };
    }
  
    // Process all nodes
    const allNodes = [];
    const allLinks = [];
    
    // Create hierarchies for each root skill
    const hierarchies = rootSkills.map((rootSkill, index) => {
      const treeData = buildTree(rootSkill, skills);
      const hierarchy = d3.hierarchy(treeData);
      
      // Apply vertical offset for each hierarchy to prevent overlap
      const verticalOffset = index * 200;
      
      // Create tree layout
      const treeLayout = d3.tree()
        .size([height - margin.top - margin.bottom - 1000, horizontalSpacing - margin.left - margin.right])
        .separation((a, b) => (a.parent === b.parent ? 2 : 3)); // Increased separation
        
      treeLayout(hierarchy);
      
      // Apply vertical offset
      hierarchy.x += verticalOffset;
      hierarchy.descendants().forEach(node => {
        if (node !== hierarchy) {
          node.x += verticalOffset;
        }
        
        // Ensure consistent horizontal spacing
        node.y = node.depth * 200; // Fixed level separation
      });
      
      return hierarchy;
    });
    
    // Collect all nodes and links
    hierarchies.forEach(hierarchy => {
      allNodes.push(...hierarchy.descendants());
      allLinks.push(...hierarchy.links());
    });
  
    // Calculate appropriate initial position and scale
    const initialX = (margin.left - 130);
    const initialY = (margin.top + 250);
  
    // Larger initial scale for better visibility on all devices
    const initialScale = Math.max(0.8, Math.min(1.2, width / 1000));
    
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

    const g = svg.append('g')
      .attr('transform', `translate(${transformRef.current.x},${transformRef.current.y}) scale(${initialScale})`);
    gRef.current = g;
  
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
      .style('display', d => showFullTree ? 'block' : (d.target.data.hidden ? 'none' : 'block'));
  
    const node = g.selectAll('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', function(event, d) {
        if (!showFullTree && d.children) {
          const isExpanded = !d.children[0].data.hidden;
          d.children.forEach(child => {
            child.data.hidden = isExpanded;
            if (isExpanded) {
              child.descendants().forEach(desc => {
                if (desc !== child) desc.data.hidden = true;
              });
            }
          });
          updateView(d);
        }
      });
  
    node.append('circle')
      .attr('r', 15)
      .attr('fill', d => {
        if (d.data.isRootSkill) {
          return d.data.hasUnlockedDescendant ? 'green' : 'gray';
        } else {
          return d.data.unlocked ? 'green' : 'gray';
        }
      })
      .style('display', d => showFullTree ? 'block' : (d.data.hidden ? 'none' : 'block'));
  
    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => {
        if (d.data.isRootSkill) {
          return d.data.hasUnlockedDescendant ? d.data.userLevel : '';
        }
        return d.data.unlocked ? d.data.userLevel : '';
      })
      .style('display', d => showFullTree ? 'block' : (d.data.hidden ? 'none' : 'block'))
      .style('dominant-baseline', 'middle');
  
    node.append('text')
      .attr('dx', 25)
      .attr('dy', 4)
      .text(d => d.data.name)
      .style('fill', 'white')
      .style('font-size', '12px')
      .style('display', d => showFullTree ? 'block' : (d.data.hidden ? 'none' : 'block'));
  
    // Update zoom configuration
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        transformRef.current = { 
          x: event.transform.x, 
          y: event.transform.y,
          k: event.transform.k
        };
      });

    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity
        .translate(initialX, initialY)
        .scale(initialScale));
  
    function updateView(selectedNode) {
      if (showFullTree) return;
      
      g.selectAll('.link')
        .style('display', d => d.target.data.hidden ? 'none' : 'block');
      
      g.selectAll('circle')
        .style('display', d => d.data.hidden ? 'none' : 'block');
      
      g.selectAll('text')
        .style('display', d => d.data.hidden ? 'none' : 'block');
    
      if (selectedNode) {
        const currentTransform = transformRef.current;
        const currentScale = currentTransform.k || 1;
        
        const targetX = (width * 0.4) - (selectedNode.y * currentScale);
        const targetY = (height * 0.8) - (selectedNode.x * currentScale);
        
        svg.transition()
          .duration(500)
          .call(zoom.transform, d3.zoomIdentity
            .translate(targetX, targetY)
            .scale(currentScale));
      }
    }
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
    <div style={{ width: '100%', height: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Skill Tree</h2>
        <button 
          onClick={toggleFullTree}
          style={{
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