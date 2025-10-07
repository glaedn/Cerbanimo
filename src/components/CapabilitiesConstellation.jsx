import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './CapabilitiesConstellation.css';

const CapabilitiesConstellation = ({ capabilities }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!capabilities || capabilities.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 200;
    svg.attr('width', width).attr('height', height);

    const nodes = capabilities.map(d => ({ ...d, id: d.name }));
    if (nodes.length === 0) return;

    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({ source: nodes[i].id, target: nodes[i+1].id });
    }
     if (nodes.length > 2) {
      links.push({ source: nodes[nodes.length - 1].id, target: nodes[0].id });
    }

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'star-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "constellation-link");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "constellation-node");

    node.append("circle")
      .attr("r", d => 5 + (d.level || 0) * 1.5)
      .style("filter", "url(#star-glow)");

    node.append("text")
      .text(d => d.name)
      .attr("x", 10)
      .attr("y", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

  }, [capabilities]);

  return (
    <div className="capabilities-constellation-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default CapabilitiesConstellation;