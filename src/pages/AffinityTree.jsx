import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import './AffinityTree.css';
import { useAuth0 } from '@auth0/auth0-react';
import theme from '../styles/theme';

const AffinityTree = () => {
  const svgRef = useRef();
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [affinities, setAffinities] = useState([]);
  const gRef = useRef();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [showFullTree, setShowFullTree] = useState(false);
  
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth * 0.9,
    height: window.innerHeight * 0.8
  });

  const userIdRef = useRef(null);

  useEffect(() => {
    const fetchAffinities = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const token = await getAccessTokenSilently({
          audience: import.meta.env.VITE_BACKEND_URL,
          scope: 'openid profile email read:profile',
        });

        const profileResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/profile`, {
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

        const affinitiesResponse = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/skills/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const processedAffinities = affinitiesResponse.data.map(affinity => {
          let unlockedUsers = affinity.unlocked_users || [];
          
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
            ...affinity,
            unlocked_users: unlockedUsers,
            unlocked: isUnlocked,
            hidden: false,
            userLevel: userLevel
          };
        });

        setAffinities(processedAffinities);
      } catch (error) {
        console.error(`Failed to fetch ${theme.terminology.skill_plural}:`, error);
      }
    };

    fetchAffinities();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  useEffect(() => {
    if (!affinities.length) return;
  
    const margin = { top: 60, right: 150, bottom: 60, left: 150 };
    const { width, height } = dimensions;
  
    const maxHorizontalSpacing = 800;
    const horizontalSpacing = Math.min(maxHorizontalSpacing, width * 0.8);
  
    const findRootAffinities = () => {
      if (showFullTree) {
        return affinities.filter(affinity => affinity.parent_skill_id === null);
      } else {
        const unlockedAffinityIds = affinities.filter(affinity => affinity.unlocked).map(affinity => affinity.id);
        const rootAffinityIds = new Set();
        
        unlockedAffinityIds.forEach(affinityId => {
          let currentAffinity = affinities.find(s => s.id === affinityId);
          while (currentAffinity && currentAffinity.parent_skill_id !== null) {
            currentAffinity = affinities.find(s => s.id === currentAffinity.parent_skill_id);
          }
          if (currentAffinity) {
            rootAffinityIds.add(currentAffinity.id);
          }
        });
        
        return affinities.filter(affinity => rootAffinityIds.has(affinity.id));
      }
    };
  
    const rootAffinities = findRootAffinities();
    if (!rootAffinities.length) return;
  
    function computeAccumulatedLevels(affinityId, allAffinities) {
      const affinity = allAffinities.find(s => s.id === affinityId);
      if (!affinity) return 0;
      
      const children = allAffinities.filter(s => s.parent_skill_id === affinityId);
      if (children.length === 0) {
        return affinity.userLevel || 0;
      }
      
      return children.reduce((sum, child) => {
        return sum + computeAccumulatedLevels(child.id, allAffinities);
      }, 0);
    }
  
    const accumulatedLevels = {};
    rootAffinities.forEach(root => {
      accumulatedLevels[root.id] = computeAccumulatedLevels(root.id, affinities);
    });

    function computeSubtreeHeight(affinity, allAffinities) {
      const children = allAffinities.filter(s => s.parent_skill_id === affinity.id);
      if (children.length === 0) {
        return 1;
      }
      return children.reduce((sum, child) => sum + computeSubtreeHeight(child, allAffinities), 1);
    }

    const subtreeHeights = {};
    rootAffinities.forEach(root => {
      subtreeHeights[root.id] = computeSubtreeHeight(root, affinities);
    });
    
    function buildTree(affinity, allAffinities, depth = 0) {
      const children = allAffinities.filter(s => s.parent_skill_id === affinity.id);
      
      const hasUnlockedDescendant = 
        affinity.unlocked ||
        children.some(child => 
          child.unlocked || 
          allAffinities.some(s => s.parent_skill_id === child.id && s.unlocked)
        );
      
      const isLeafNode = children.length === 0;
      const displayLevel = isLeafNode 
        ? (affinity.userLevel || 0)
        : (accumulatedLevels[affinity.id] || 0);
      
      const shouldIncludeInPartialTree = showFullTree || affinity.unlocked ||
        (hasUnlockedDescendant && (depth === 0 || affinity.parent_skill_id === null));
      
      const filteredChildren = showFullTree ? children : 
        children.filter(child => 
          child.unlocked || allAffinities.some(s =>
            s.parent_skill_id === child.id && s.unlocked
          )
        );
      
      return {
        name: affinity.name,
        id: affinity.id,
        unlocked: affinity.unlocked,
        isRootAffinity: depth === 0,
        userLevel: displayLevel,
        hasUnlockedDescendant: hasUnlockedDescendant,
        depth: depth,
        hidden: false,
        shouldRender: shouldIncludeInPartialTree,
        children: filteredChildren.map(child => buildTree(child, allAffinities, depth + 1))
          .filter(node => node.shouldRender || showFullTree),
      };
    }
  
    const allNodes = [];
    const allLinks = [];
    
    const hierarchies = rootAffinities.map((rootAffinity, index) => {
      const treeData = buildTree(rootAffinity, affinities);
      
      if (!showFullTree && !treeData.shouldRender) {
        return null;
      }
      
      const hierarchy = d3.hierarchy(treeData);
      
      const treeLayout = d3.tree()
        .size([hierarchy.descendants().length * 40, horizontalSpacing - margin.left - margin.right])
        .separation((a, b) => (a.parent === b.parent ? 2 : 3));
      
      treeLayout(hierarchy);
      
      return hierarchy;
    }).filter(Boolean);
    
    let currentOffset = margin.top;
    hierarchies.forEach((hierarchy, index) => {
      const treeHeight = hierarchy.descendants().length * 40;
      
      const verticalOffset = currentOffset;
      
      hierarchy.descendants().forEach(node => {
        node.x += verticalOffset;
      });
      
      currentOffset += treeHeight + 200;
    });
    
    hierarchies.forEach(hierarchy => {
      allNodes.push(...hierarchy.descendants());
      allLinks.push(...hierarchy.links());
    });
  
    const totalTreeHeight = currentOffset - 200;
    
    const initialX = margin.left;
    const initialY = Math.max(20, (height - totalTreeHeight) / 2);
  
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

    const defs = svg.append('defs');
    
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
  
    const node = g.selectAll('.node')
      .data(allNodes)
      .enter().append('g')
      .attr('class', d => `node ${d.data.isRootAffinity ? 'root-node' : ''}`)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('display', d => (showFullTree || !d.data.hidden) ? 'block' : 'none');
      
    function calculateRootNodeSize(d) {
      if (!d.data.isRootAffinity) return 15;
      
      const nameLength = d.data.name.length;
      const levelDigits = d.data.userLevel ? d.data.userLevel.toString().length : 0;
      
      return Math.max(20, 20 + (nameLength * 0.3) + (levelDigits * 1));
    }
  
    node.append('circle')
      .attr('class', d => d.data.isRootAffinity ? 'root-socket' : 'socket')
      .attr('r', d => calculateRootNodeSize(d) + 2)
      .attr('fill', '#222')
      .attr('stroke', '#C3CDD4')
      .attr('stroke-width', 2);
      
    node.append('circle')
      .attr('class', d => d.data.isRootAffinity ? 'root-orb' : 'orb')
      .attr('r', d => calculateRootNodeSize(d))
      .attr('fill', d => {
        if (d.data.isRootAffinity) {
          return d.data.hasUnlockedDescendant ? 'url(#greenOrbGradient)' : 'url(#graySocketGradient)';
        } else {
          return d.data.unlocked ? 'url(#greenOrbGradient)' : 'url(#graySocketGradient)';
        }
      })
      .attr('stroke', d => {
        if (d.data.isRootAffinity) {
          return d.data.hasUnlockedDescendant ? '#006600' : '#333';
        } else {
          return d.data.unlocked ? '#006600' : '#333';
        }
      })
      .attr('stroke-width', .5);
      
    node.filter(d => d.data.unlocked || (d.data.isRootAffinity && d.data.hasUnlockedDescendant))
      .append('circle')
      .attr('class', d => d.data.isRootAffinity ? 'root-highlight' : 'highlight')
      .attr('r', d => {
        const baseSize = calculateRootNodeSize(d);
        return baseSize / 3;
      })
      .attr('cx', d => -calculateRootNodeSize(d) * 0.4)
      .attr('cy', d => -calculateRootNodeSize(d) * 0.4)
      .attr('fill', 'rgba(255, 255, 255, 0.5)')
      .attr('stroke', 'none')
      .attr('stroke-width', 0);
  
    node.append('text')
      .attr('class', d => d.data.isRootAffinity ? 'root-level-text' : 'level-text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .style('font-size', d => d.data.isRootAffinity ? '16px' : '14px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => {
        if (d.data.isRootAffinity) {
          return d.data.hasUnlockedDescendant ? d.data.userLevel : '';
        }
        return d.data.unlocked ? d.data.userLevel : '';
      })
      .style('dominant-baseline', 'middle');

    const labelLayer = svg.append('g')
      .attr('class', 'label-layer')
      .attr('transform', `translate(${transformRef.current.x},${transformRef.current.y}) scale(${initialScale})`);
  
    labelLayer.selectAll('.node-label')
      .data(allNodes)
      .enter()
      .append('text')
      .attr('class', d => d.data.isRootAffinity ? 'root-label' : 'node-label')
      .attr('x', d => d.y + 25)
      .attr('y', d => d.x + 4)
      .text(d => d.data.name)
      .style('fill', 'white')
      .style('font-size', d => d.data.isRootAffinity ? '16px' : '12px')
      .style('font-weight', d => d.data.isRootAffinity ? 'bold' : 'normal')
      .style('display', d => (showFullTree || !d.data.hidden) ? 'block' : 'none');
  
    const MIN_ROOT_SIZE_MULTIPLIER = 0.6;
    const MAX_ROOT_SIZE_MULTIPLIER = 3.5;
    const MIN_ROOT_LABEL_SIZE = 12;
    const MAX_ROOT_LABEL_SIZE = 72;
  
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        labelLayer.attr('transform', event.transform);
        
        transformRef.current = { 
          x: event.transform.x, 
          y: event.transform.y,
          k: event.transform.k
        };
        
        const sizeAdjustFactor = Math.min(
          MAX_ROOT_SIZE_MULTIPLIER, 
          Math.max(MIN_ROOT_SIZE_MULTIPLIER, 1 / event.transform.k)
        );
        
        const fontSizeAdjust = Math.min(
          MAX_ROOT_LABEL_SIZE, 
          Math.max(MIN_ROOT_LABEL_SIZE, 16 / event.transform.k)
        );
        
        labelLayer.selectAll('.root-label')
          .style('font-size', `${fontSizeAdjust}px`);
          
        g.selectAll('.root-orb')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            return baseSize * sizeAdjustFactor;
          });
          
        g.selectAll('.root-socket')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            return (baseSize + 2) * sizeAdjustFactor;
          });
          
        g.selectAll('.root-highlight')
          .attr('r', d => {
            const baseSize = calculateRootNodeSize(d);
            return (baseSize / 3) * sizeAdjustFactor;
          })
          .attr('cx', d => {
            const baseSize = calculateRootNodeSize(d);
            return (-baseSize * 0.4) * sizeAdjustFactor;
          })
          .attr('cy', d => {
            const baseSize = calculateRootNodeSize(d);
            return (-baseSize * 0.4) * sizeAdjustFactor;
          });
          
        g.selectAll('.root-level-text')
          .style('font-size', `${fontSizeAdjust}px`);
      });

    svg.call(zoom)
      .call(zoom.transform, d3.zoomIdentity
        .translate(initialX, initialY)
        .scale(initialScale));
  
    hierarchies.forEach((hierarchy, index) => {
      if (index > 0) {
        const prevTree = hierarchies[index - 1];
        const currentTree = hierarchy;
        
        const lowestPrevNode = prevTree.descendants()
          .reduce((lowest, node) => node.x > lowest.x ? node : lowest, prevTree);
        
        const highestCurrentNode = currentTree.descendants()
          .reduce((highest, node) => node.x < highest.x ? node : highest, currentTree);
        
        const midpointY = (lowestPrevNode.x + highestCurrentNode.x) / 2;
        
        g.append('line')
          .attr('class', 'tree-separator')
          .attr('x1', 0)
          .attr('y1', midpointY)
          .attr('x2', 50)
          .attr('y2', midpointY)
          .attr('stroke', '#444')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      }
    });
    
  }, [affinities, dimensions, showFullTree]);

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
        <h2>{theme.terminology.skill} Tree</h2>
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

export default AffinityTree;