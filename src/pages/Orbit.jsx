import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Orbit.css';
import IntentionLotusMap from './IntentionLotusMap'; // To be used as an overlay

const Orbit = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const [personalIntentions, setPersonalIntentions] = useState([]);
  const [nearIntentions, setNearIntentions] = useState([]);
  const [chronicleResonance, setChronicleResonance] = useState([]);
  const [selectedIntention, setSelectedIntention] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const token = await getAccessTokenSilently();
        // Fetch personal intentions
        const personalRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions/personal`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { auth0Id: user.sub }
        });
        setPersonalIntentions(personalRes.data);

        // Fetch "near" intentions (from realms the user is a member of)
        // This is a placeholder; a more complex query would be needed for a full implementation
        const nearRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/intentions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setNearIntentions(nearRes.data.filter(intention => !personalRes.data.some(p => p.id === intention.id)).slice(0, 10)); // Placeholder logic

        // Fetch chronicle resonance data
        // This is also a placeholder
        const chronicleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/chronicles`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setChronicleResonance(chronicleRes.data.slice(0, 15)); // Placeholder logic

      } catch (error) {
        console.error("Failed to fetch Orbit data:", error);
      }
    };

    fetchData();
  }, [user, getAccessTokenSilently]);

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // Clear previous render

      const width = +svg.attr('width');
      const height = +svg.attr('height');
      const centerX = width / 2;
      const centerY = height / 2;

      const rings = [
        { radius: 100, data: personalIntentions, type: 'personal' },
        { radius: 200, data: nearIntentions, type: 'near' },
        { radius: 300, data: chronicleResonance, type: 'chronicle' }
      ];

      // Draw rings
      rings.forEach(ring => {
        svg.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', ring.radius)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.2)');
      });

      // Draw nodes
      rings.forEach(ring => {
        const angleStep = 360 / ring.data.length;
        ring.data.forEach((d, i) => {
          const angle = angleStep * i * (Math.PI / 180);
          const x = centerX + ring.radius * Math.cos(angle);
          const y = centerY + ring.radius * Math.sin(angle);

          const node = svg.append('g')
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', () => {
              if (ring.type === 'personal' || ring.type === 'near') {
                setSelectedIntention(d.id);
              }
            });

          node.append('circle')
            .attr('r', 10)
            .attr('fill', ring.type === 'personal' ? 'gold' : (ring.type === 'near' ? 'cyan' : 'magenta'));

          node.append('text')
            .text(d.name)
            .attr('dy', -15)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '10px');
        });
      });

      // Center Orbit element
      const center = svg.append('g')
        .attr('transform', `translate(${centerX}, ${centerY})`);

      center.append('circle')
        .attr('r', 40)
        .attr('fill', 'rgba(255, 255, 255, 0.1)');

      center.append('text')
        .text('Orbit')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', 'white')
        .style('font-size', '14px');
    }
  }, [personalIntentions, nearIntentions, chronicleResonance]);

  if (selectedIntention) {
    // This is a simplified overlay. A more robust solution might use a modal library.
    return (
      <div className="lotus-map-overlay">
        <button onClick={() => setSelectedIntention(null)} className="close-overlay-btn">Close</button>
        <IntentionLotusMap />
      </div>
    );
  }

  return (
    <div className="orbit-container">
      <svg ref={svgRef} width="800" height="800"></svg>
    </div>
  );
};

export default Orbit;