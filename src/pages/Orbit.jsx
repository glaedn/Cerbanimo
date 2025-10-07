import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Orbit.css';
import IntentionLotusMap from './IntentionLotusMap';
import { useUserProfile } from '../hooks/useUserProfile';
import { useCapabilityData } from '../hooks/useCapabilityData';

const getTitleForLevel = (level) => {
  if (level >= 50) return "Cosmic Weaver";
  if (level >= 40) return "Star Forger";
  if (level >= 30) return "Celestial Navigator";
  if (level >= 20) return "Galaxy Wanderer";
  if (level >= 10) return "Vision Weaver";
  return "Dream Spark";
};

const Orbit = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const { profile } = useUserProfile();
  const { allCapabilities } = useCapabilityData();
  const [personalIntentions, setPersonalIntentions] = useState([]);
  const [nearIntentions, setNearIntentions] = useState([]);
  const [chronicleResonance, setChronicleResonance] = useState([]);
  const [selectedIntention, setSelectedIntention] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [userLevel, setUserLevel] = useState(1);
  const [userTitle, setUserTitle] = useState("Dream Spark");

  useEffect(() => {
    if (profile && allCapabilities) {
      let totalGlobalExp = 0;
      allCapabilities.forEach(capability => {
        if (capability.unlocked_users && Array.isArray(capability.unlocked_users)) {
          capability.unlocked_users.forEach(userEntry => {
            if (userEntry && userEntry.user_id == profile.id) {
              const experienceValue = userEntry.experience !== undefined ? userEntry.experience : userEntry.exp;
              if (typeof experienceValue === 'number') {
                totalGlobalExp += experienceValue;
              }
            }
          });
        }
      });
      const level = Math.floor(Math.sqrt(totalGlobalExp / 40)) + 1;
      setUserLevel(level);
      setUserTitle(getTitleForLevel(level));
    }
  }, [profile, allCapabilities]);

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
        { radius: 150, data: personalIntentions, type: 'personal', color: 'gold', size: 10 },
        { radius: 250, data: nearIntentions, type: 'near', color: 'cyan', size: 8 },
        { radius: 350, data: chronicleResonance, type: 'chronicle', color: 'magenta', size: 6 }
      ];

      // Draw orbit rings
      rings.forEach(ring => {
        svg.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', ring.radius)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.1)')
          .attr('class', 'orbit-ring');
      });

      const allNodes = rings.flatMap(r => r.data);
      const maxResonance = Math.max(...allNodes.map(d => d.resonance_score || 0), 1);

      // Draw nodes on rings
      rings.forEach(ring => {
        const angleStep = ring.data.length > 0 ? 360 / ring.data.length : 0;
        ring.data.forEach((d, i) => {
          const angle = angleStep * i * (Math.PI / 180);
          const x = centerX + ring.radius * Math.cos(angle);
          const y = centerY + ring.radius * Math.sin(angle);

          const node = svg.append('g')
            .attr('transform', `translate(${x}, ${y})`)
            .attr('class', 'orbit-node-group')
            .style('cursor', 'pointer')
            .on('click', () => setSelectedIntention(d.id))
            .on('mouseover', (event) => showTooltip(event, d))
            .on('mouseout', hideTooltip);

          const isResonated = d.userHasResonated || false;

          const resonanceOpacity = d.resonance_score ? (d.resonance_score / maxResonance) : 0.2;

          node.append('circle')
            .attr('r', ring.size)
            .attr('fill', ring.color)
            .attr('stroke', isResonated ? '#00ff00' : 'none')
            .attr('stroke-width', isResonated ? 2 : 0)
            .attr('class', 'orbit-node')
            .style('filter', 'url(#glow)')
            .style('opacity', resonanceOpacity);

          const handleResonate = async (intentionId) => {
            if (!profile) return;
            try {
                const token = await getAccessTokenSilently();
                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/intentions/${intentionId}/resonate`,
                    { userId: profile.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log(`Successfully resonated with intention ${intentionId}`);
            } catch (error) {
                console.error("Failed to resonate with intention:", error);
            }
          };

          const resonateButton = node.append('g')
            .attr('class', 'resonate-button')
            .style('opacity', 0)
            .on('click', (event) => {
              event.stopPropagation();
              handleResonate(d.id);
            });

          resonateButton.append('circle')
            .attr('r', 15)
            .attr('fill', 'rgba(0, 255, 127, 0.5)');
          resonateButton.append('text')
            .text('✨')
            .attr('text-anchor', 'middle')
            .attr('dy', 5)
            .style('font-size', '12px');

          node.on('mouseenter', function() {
            d3.select(this).select('.resonate-button').style('opacity', 1);
          });
          node.on('mouseleave', function() {
            d3.select(this).select('.resonate-button').style('opacity', 0);
          });
        });
      });

      // Center element (User's Core)
      const center = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);
      center.append('circle')
        .attr('r', 50)
        .attr('fill', 'rgba(255, 255, 255, 0.1)')
        .style('filter', 'url(#glow)');
      center.append('text')
        .text('☀')
        .attr('text-anchor', 'middle')
        .attr('dy', 10)
        .attr('fill', 'white')
        .style('font-size', '30px');
    }
  }, [personalIntentions, nearIntentions, chronicleResonance, getAccessTokenSilently, user, profile, allCapabilities]);

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
      <div className="orbit-header">
        <div className="user-level">
          [ Level {userLevel} — {userTitle} ]
        </div>
        <button className="toggle-capabilities-btn">
          [ Toggle Capabilities ⊕ ]
        </button>
      </div>
      {tooltip.visible && <div className="tooltip" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>{tooltip.content}</div>}
      <svg ref={svgRef} width="800" height="800"></svg>
    </div>
  );
};

export default Orbit;