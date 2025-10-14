import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import './RealmsMesh.css';

const RealmsMesh = () => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const { getAccessTokenSilently } = useAuth0();
  const [realms, setRealms] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const [realmsResponse, linksResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/realms/resonance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setRealms(realmsResponse.data.realms);
        setLinks(linksResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!svgRef.current || realms.length === 0 || links.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const simulation = d3.forceSimulation(realms)
      .force('link', d3.forceLink(links).id(d => d.id).distance(200))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .style('stroke-opacity', d => 0.6 + d.alignment * 0.4)
      .style('stroke-width', d => 1 + d.alignment * 4);

    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(realms)
      .enter().append('g');

    node.append('circle')
      .attr('r', 20)
      .attr('fill', '#c471ed');

    node.append('text')
      .text(d => d.name)
      .attr('x', 25)
      .attr('y', 5);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

  }, [realms, links]);

  return (
    <div className="realms-mesh-container" ref={containerRef}>
      <h1>✦ REALMS MESH ✦</h1>
      <div className="visualization-wrapper">
        <svg ref={svgRef}></svg>
      </div>
      <div className="realm-controls">
        <button className="control-button">[ FORM A NEW REALM ✦ ]</button>
      </div>
    </div>
  );
};

export default RealmsMesh;