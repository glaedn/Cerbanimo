import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Box, Typography } from '@mui/material';
import theme from '../../styles/theme';

const CivicIdentityConstellation = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef(null);

  // Default data for preview if none provided
  const constellationData = useMemo(() => data || {
    nodes: [
      { id: 'core', label: 'Civic Core', type: 'core', size: 30 },
      { id: 'mutual-aid', label: 'Mutual Aid', type: 'domain', size: 20 },
      { id: 'logistics', label: 'Crisis Logistics', type: 'domain', size: 18 },
      { id: 'governance', label: 'Governance', type: 'domain', size: 15 },
      { id: 'mentor-1', label: 'Mentorship', type: 'trait', size: 12 },
      { id: 'trust-1', label: 'Community Trust', type: 'signal', size: 10 },
    ],
    links: [
      { source: 'core', target: 'mutual-aid' },
      { source: 'core', target: 'logistics' },
      { source: 'core', target: 'governance' },
      { source: 'mutual-aid', target: 'trust-1' },
      { source: 'mutual-aid', target: 'mentor-1' },
    ]
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(constellationData.nodes)
      .force("link", d3.forceLink(constellationData.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => d.size + 10));

    const g = svg.append("g");

    // Add star background effect
    for (let i = 0; i < 50; i++) {
      g.append("circle")
        .attr("cx", Math.random() * width)
        .attr("cy", Math.random() * height)
        .attr("r", Math.random() * 1.5)
        .attr("fill", "white")
        .attr("opacity", Math.random() * 0.5);
    }

    const link = g.append("g")
      .attr("stroke", "rgba(0, 243, 255, 0.2)")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(constellationData.links)
      .join("line");

    const node = g.append("g")
      .selectAll("g")
      .data(constellationData.nodes)
      .join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Star glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => {
        if (d.type === 'core') return '#00f3ff';
        if (d.type === 'domain') return '#ff5ca2';
        if (d.type === 'trait') return '#00D787';
        return '#4DABF7';
      })
      .attr("filter", "url(#glow)")
      .style("cursor", "pointer");

    node.append("text")
      .text(d => d.label.toUpperCase())
      .attr("dy", d => d.size + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("font-family", "Orbitron")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [constellationData, width, height]);

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      bgcolor: 'rgba(10, 10, 46, 0.4)',
      borderRadius: 2,
      overflow: 'hidden',
      border: '1px solid rgba(0, 243, 255, 0.1)',
      position: 'relative'
    }}>
      <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
        <Typography variant="caption" sx={{ color: '#00f3ff', fontFamily: 'Orbitron', letterSpacing: 2 }}>
          IDENTITY_CONSTELLATION_V2.0
        </Typography>
      </Box>
      <svg ref={svgRef} width={width} height={height} style={{ maxWidth: '100%', height: 'auto' }} />
    </Box>
  );
};

export default CivicIdentityConstellation;
