import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import api from '../../../utils/api';
import './GalacticActivityMap.css';

// Performance Note:
// MAP_WIDTH and MAP_HEIGHT are calculated once on component load.
// For a dynamically resizing map, consider using useState and useEffect with a ResizeObserver
// to update these dimensions and trigger a re-render/re-layout.
// const MAP_WIDTH = window.innerWidth * 0.9; // Old
// const MAP_HEIGHT = window.innerHeight * 0.8; // Old

const GalacticActivityMap = () => {
  const d3Container = useRef(null);
  const tooltipRef = useRef(null);
  const [starData, setStarData] = useState([]);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 }); // New
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper functions (getStarColor, getStarRadius, getStarBrightness)
  // Performance Note: These functions are called per star during rendering or updates.
  // They are currently simple and efficient. Avoid complex computations here if possible,
  // or memoize if they become bottlenecks with very large datasets.
  const getStarColor = (item) => {
    const status = item.status.toLowerCase();
    if (status.includes('urgent')) return '#ff0000';
    if (status.includes('completed') || status.includes('archived')) return '#ff69b4';
    if (status.includes('active')) return '#00ff00';
    if (status.includes('inactive')) return '#808080';
    return '#ffffff';
  };

  const getStarRadius = (item) => {
    let baseRadius = item.type === 'task' ? 4 : item.type === 'project' ? 7 : 9;
    if (item.status.toLowerCase().includes('urgent')) baseRadius *= 1.2;
    return baseRadius + Math.min(item.contributors / 2, 5);
  };

  const getStarBrightness = (item) => {
    const now = new Date();
    const lastActivityDate = new Date(item.lastActivity);
    const diffHours = (now - lastActivityDate) / (1000 * 60 * 60);
    const status = item.status.toLowerCase();

    if (status.includes('inactive')) return Math.max(0.1, 0.5 - diffHours / (24 * 14));
    if (status.includes('completed') || status.includes('archived')) return Math.max(0.15, 0.6 - diffHours / (24 * 30));
    return Math.max(0.4, 0.9 - diffHours / (24 * 7));
  };
  
  // useEffect for fetching data (remains the same)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [tasksRes, projectsRes, communitiesRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/projects'),
          api.get('/communities')
        ]);
        const processedData = [];
        tasksRes.data.forEach(task => {
          processedData.push({
            id: `task-${task.id}`, type: 'task', name: task.name, status: task.status || 'inactive',
            lastActivity: new Date(task.updated_at || task.created_at),
            contributors: task.assigned_user_ids ? task.assigned_user_ids.length : 0, raw_data: task
          });
        });
        projectsRes.data.forEach(project => {
          let projectStatus = 'active';
          const urgentTasksInProject = tasksRes.data.filter(t => `project-${t.project_id}` === `project-${project.id}` && (t.status || '').toLowerCase().includes('urgent'));
          if (urgentTasksInProject.length > 0) projectStatus = 'urgent';
          processedData.push({
            id: `project-${project.id}`, type: 'project', name: project.name, status: projectStatus,
            lastActivity: new Date(project.updated_at || project.created_at || Date.now()),
            contributors: project.creator_id ? 1 : 0, raw_data: project
          });
        });
        const communities = communitiesRes.data.communities || communitiesRes.data;
        communities.forEach(community => {
          processedData.push({
            id: `community-${community.id}`, type: 'community', name: community.name, status: 'active',
            lastActivity: new Date(community.updated_at || community.created_at || Date.now()),
            contributors: community.members ? community.members.length : 0, raw_data: community
          });
        });
        setStarData(processedData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // useEffect for D3 rendering
  useEffect(() => {
    if (d3Container.current && !isLoading && !error && starData.length > 0) {
      const { clientWidth, clientHeight } = d3Container.current;
      // setMapDimensions({ width: clientWidth, height: clientHeight }); // Set state if needed elsewhere

      let svg = d3.select(d3Container.current).select('svg');
      svg.selectAll('*').remove();

      if (svg.empty()) {
        svg = d3.select(d3Container.current).append('svg');
      }
      
      svg.attr('width', clientWidth)
         .attr('height', clientHeight)
         .style('background-color', 'transparent')
         .attr('viewBox', `0 0 ${clientWidth} ${clientHeight}`);

      const defs = svg.append('defs');
      // Performance Note: SVG filters can be costly.
      // The current 'glow' filter is moderate. For very large numbers of stars,
      // consider simplifying or removing the filter, or using canvas rendering.
      const filter = defs.append('filter').attr('id', 'glow');
      filter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Performance Note: Force simulation is run once per data update.
      // Running it for a fixed number of ticks (e.g., 150) is efficient for static layouts.
      // Avoid running the simulation continuously if not needed.
      const simulation = d3.forceSimulation(starData)
          .force('charge', d3.forceManyBody().strength(-35))
          .force('center', d3.forceCenter(clientWidth / 2, clientHeight / 2)) // Use clientWidth/Height
          .force('collision', d3.forceCollide().radius(d => getStarRadius(d) + (d.type === 'task' ? 2:4) ))
          .stop(); // Important: simulation is stopped after ticks.

      for (let i = 0; i < 150; ++i) simulation.tick();

      const stars = svg.selectAll('.star')
        .data(starData, d => d.id) // Keying data by d.id is good for object constancy.
        .enter()
        .append('circle')
        .attr('class', d => `star star-${d.type} star-status-${d.status.toLowerCase().split('-')[0]}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => getStarRadius(d))
        .attr('fill', d => getStarColor(d))
        .attr('opacity', d => getStarBrightness(d))
        .style('filter', 'url(#glow)');

      const tooltip = d3.select(tooltipRef.current);

      stars.on('mouseover', (event, d) => {
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`
            <div class="tooltip-name">${d.name} (${d.type})</div>
            <div class="tooltip-status">Status: ${d.status}</div>
            <div class="tooltip-activity">Last Activity: ${d.lastActivity.toLocaleDateString()} ${d.lastActivity.toLocaleTimeString()}</div>
            <div class="tooltip-contributors">Contributors: ${d.contributors}</div>
          `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mousemove', (event, d) => {
          tooltip.style('left', (event.pageX + 15) + 'px')
                 .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', (event, d) => {
          tooltip.transition().duration(500).style('opacity', 0);
        });

      // Performance Note: Pulsing animations.
      // Applying to all 'active'/'urgent' stars. If this becomes too many,
      // consider limiting the number of simultaneously pulsing stars or simplifying the animation.
      // D3 transitions are generally efficient for this.
      stars.each(function(d) {
        const starElement = d3.select(this);
        const status = d.status.toLowerCase();
        if (status.includes('active') || status.includes('urgent')) {
          const initialRadius = getStarRadius(d);
          const pulse = () => {
            if (!this.isConnected) return; // Stop animation if element is removed
            starElement.transition()
              .duration(1000 + Math.random() * 500)
              .attr('r', initialRadius * 1.15)
              .transition()
              .duration(1000 + Math.random() * 500)
              .attr('r', initialRadius)
              .on('end', pulse); // Loop animation
          };
          pulse();
        }
      });

    } else if (d3Container.current && (isLoading || error)) {
        let svg = d3.select(d3Container.current).select('svg');
        if (!svg.empty()) {
            svg.selectAll('*').remove();
        }
    }
    // Performance Note for future:
    // If the number of stars grows into thousands, SVG might become slow.
    // Consider these options:
    // 1. Canvas Rendering: Use D3 to draw onto an HTML5 canvas. This is faster for large numbers of simple shapes.
    // 2. WebGL: For even better performance and 3D capabilities, libraries like Three.js or PixiJS.
    // 3. Aggregation/Clustering: Group distant or less important stars into larger nodes.
    // 4. Virtualization: Only render stars currently in the viewport (if panning/zooming is added).
  }, [starData, isLoading, error, d3Container]); // Added d3Container to dependencies

  if (isLoading) { 
    return (
      // Removed className="galactic-activity-map-container" and h1
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading celestial data...</p>
      </div>
    );
  }
  if (error) { 
    return (
      // Removed className="galactic-activity-map-container" and h1
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    // Removed className="galactic-activity-map-container" and h1
    <>
      <div ref={d3Container} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* SVG is managed by D3 inside this div */}
      </div>
      <div ref={tooltipRef} className="galactic-tooltip" style={{ opacity: 0 }}></div>
    </>
  );
};

export default GalacticActivityMap;
