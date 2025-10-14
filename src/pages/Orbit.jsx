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
        setNearIntentions(nearRes.data.slice(0, 16));

        const chronicleRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/chronicles/resonance`, config);
        setChronicleResonance(chronicleRes.data.slice(0, 24));

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
        { radius: 150, data: personalIntentions, type: 'personal', size: 8 },
        { radius: 250, data: nearIntentions, type: 'near', size: 7 },
        { radius: 350, data: chronicleResonance, type: 'chronicle', size: 9 }
      ];

      rings.forEach(ring => {
        svg.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', ring.radius)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.2)')
          .attr('class', 'orbit-ring');
      });

      const allNodes = rings.flatMap(r => r.data);
      const maxResonance = Math.max(...allNodes.map(d => d.resonance_score || 0), 1);

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
          const resonanceOpacity = d.resonance_score ? 0.3 + (d.resonance_score / maxResonance) * 0.7 : 0.3;

          if (ring.type === 'personal' || ring.type === 'near') {
            node.append('circle')
              .attr('r', ring.size)
              .attr('fill', isResonated ? 'white' : 'none')
              .attr('stroke', 'white')
              .attr('stroke-width', 1.5)
              .style('filter', 'url(#glow)')
              .style('opacity', resonanceOpacity);
          } else if (ring.type === 'chronicle') {
            node.append('text')
              .text('✧')
              .attr('text-anchor', 'middle')
              .attr('dy', ring.size / 2)
              .attr('fill', 'white')
              .style('font-size', `${ring.size * 2}px`)
              .style('filter', 'url(#glow)')
              .style('opacity', resonanceOpacity);
          }

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
        <h1>✦ YOUR ORBIT ✦</h1>
        <p>(Dashboard + Intention Lotus)</p>
        <div className="user-level">
          [ Level {userLevel} — {userTitle} ]
        </div>
        <button className="toggle-capabilities-btn">
          [ Toggle Capabilities ⊕ ]
        </button>
        <div className="dashboard-nav">
          <button onClick={() => navigate('/analytics-dashboard')}>[ Analytics ]</button>
          <button onClick={() => navigate('/reward-dashboard')}>[ Rewards ]</button>
          <button onClick={() => navigate('/realms-mesh')}>[ Realms ]</button>
        </div>
      </div>
      <div className="orbit-legend">
        <span>○ = Petal / Intention</span>
        <span>◎ = Resonated Intention</span>
        <span>☀ = Your Core Intentions</span>
        <span>✧ = Realms / Connections</span>
      </div>
      {tooltip.visible && <div className="tooltip" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>{tooltip.content}</div>}
      <svg ref={svgRef} width="800" height="800"></svg>
      <button className="align-button">[ ALIGN ]</button>
    </div>
  );
};

export default Orbit;