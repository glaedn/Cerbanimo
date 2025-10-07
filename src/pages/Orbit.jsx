import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Orbit.css';
import IntentionLotusMap from './IntentionLotusMap';

const Orbit = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const [personalIntentions, setPersonalIntentions] = useState([]);
  const [nearIntentions, setNearIntentions] = useState([]);
  const [chronicleResonance, setChronicleResonance] = useState([]);
  const [selectedIntention, setSelectedIntention] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await getAccessTokenSilently();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const personalRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/personal`, { ...config, params: { auth0Id: user.sub } });
        setPersonalIntentions(personalRes.data);

        const nearRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/near`, { ...config, params: { auth0Id: user.sub } });
        setNearIntentions(nearRes.data.slice(0, 10));

        const chronicleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/chronicles/resonance`, config);
        setChronicleResonance(chronicleRes.data.slice(0, 15));

      } catch (error) {
        console.error("Failed to fetch Orbit data:", error);
      }
    };

    fetchData();
  }, [user, getAccessTokenSilently]);

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = +svg.attr('width');
      const height = +svg.attr('height');
      const centerX = width / 2;
      const centerY = height / 2;

      // Define the glow filter
      const defs = svg.append('defs');
      const filter = defs.append('filter')
        .attr('id', 'glow');
      filter.append('feGaussianBlur')
        .attr('stdDeviation', '3.5')
        .attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const showTooltip = (event, d) => {
        setTooltip({
          visible: true,
          content: `${d.name} ${d.resonance_score ? `(Resonance: ${d.resonance_score})` : ''}`,
          x: event.pageX,
          y: event.pageY,
        });
      };

      const hideTooltip = () => setTooltip({ visible: false, content: '', x: 0, y: 0 });

      const rings = [
        { radius: 200, data: nearIntentions, type: 'near' },
        { radius: 300, data: chronicleResonance, type: 'chronicle' }
      ];

      rings.forEach(ring => {
        svg.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', ring.radius)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.1)')
          .attr('class', 'orbit-ring');
      });

      const maxResonance = Math.max(...[...nearIntentions, ...chronicleResonance].map(d => d.resonance_score || 0), 1);

      rings.forEach(ring => {
        const angleStep = ring.data.length > 0 ? 360 / ring.data.length : 0;
        ring.data.forEach((d, i) => {
          const angle = angleStep * i * (Math.PI / 180);
          const x = centerX + ring.radius * Math.cos(angle);
          const y = centerY + ring.radius * Math.sin(angle);

          const node = svg.append('g')
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => { if (ring.type === 'near') setSelectedIntention(d.id); })
            .on('mouseover', (event) => showTooltip(event, d))
            .on('mouseout', hideTooltip);

          const resonanceOpacity = d.resonance_score ? (d.resonance_score / maxResonance) : 0.2;

          node.append('circle')
            .attr('r', 8)
            .attr('fill', ring.type === 'near' ? 'cyan' : 'magenta')
            .attr('class', 'orbit-node')
            .style('filter', 'url(#glow)')
            .style('opacity', resonanceOpacity);

          node.append('text')
             .text(d.name.substring(0,15) + (d.name.length > 15 ? '...' : ''))
             .attr('dy', -15)
             .attr('text-anchor', 'middle')
             .attr('fill', 'white')
             .style('font-size', '10px');
        });
      });

      const personalMaxResonance = Math.max(...personalIntentions.map(d => d.resonance_score || 0), 1);
      const lotusRadius = 80;
      const personalAngleStep = personalIntentions.length > 0 ? 360 / personalIntentions.length : 0;
      personalIntentions.forEach((d, i) => {
        const angle = personalAngleStep * i * (Math.PI / 180);
        const x = centerX + lotusRadius * Math.cos(angle);
        const y = centerY + lotusRadius * Math.sin(angle);

        const node = svg.append('g')
          .attr('transform', `translate(${x}, ${y})`)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedIntention(d.id))
          .on('mouseover', (event) => showTooltip(event, d))
          .on('mouseout', hideTooltip);

        const resonanceOpacity = d.resonance_score ? (d.resonance_score / personalMaxResonance) : 0.2;

        node.append('circle')
          .attr('r', 12)
          .attr('fill', 'gold')
          .attr('class', 'personal-intention-node')
          .style('filter', 'url(#glow)')
          .style('opacity', resonanceOpacity);

        node.append('text')
            .text(d.name.substring(0,15) + (d.name.length > 15 ? '...' : ''))
           .attr('dy', -20)
           .attr('text-anchor', 'middle')
           .attr('fill', 'white')
           .style('font-size', '11px');
      });

      const center = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);
      center.append('circle').attr('r', 40).attr('fill', 'rgba(255, 255, 255, 0.05)');
      center.append('text').text('Orbit').attr('text-anchor', 'middle').attr('dy', 5).attr('fill', 'white').style('font-size', '16px');
    }
  }, [personalIntentions, nearIntentions, chronicleResonance, getAccessTokenSilently, user]);

  if (selectedIntention) {
    return (
      <div className="lotus-map-overlay">
        <button onClick={() => setSelectedIntention(null)} className="close-overlay-btn">Close</button>
        <IntentionLotusMap intentionId={selectedIntention} />
      </div>
    );
  }

  return (
    <div className="orbit-container">
      {tooltip.visible && <div className="tooltip" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>{tooltip.content}</div>}
      <svg ref={svgRef} width="800" height="800"></svg>
    </div>
  );
};

export default Orbit;