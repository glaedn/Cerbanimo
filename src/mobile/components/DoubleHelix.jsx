import React, { useState, useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { dummyData } from '../dummyData';
import './DoubleHelix.css';

const { orbs } = dummyData.doubleHelix;

const DoubleHelix = () => {
  const [activeOrb, setActiveOrb] = useState(null);
  const [{ xOffset }, api] = useSpring(() => ({ xOffset: 0 }));
  const clickTimer = useRef(null);

  const handleOrbClick = (orb, x, cy) => {
    if (clickTimer.current) {
      // Double tap
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setActiveOrb(null); // Hide tooltip on double tap
      console.log(`Double tapped on orb: ${orb.title}. Opening manifestation Lotus.`);
    } else {
      // Single tap
      clickTimer.current = setTimeout(() => {
        setActiveOrb({ ...orb, x, cy });
        clickTimer.current = null;
      }, 250);
    }
  };

  const bind = useDrag(({ down, movement: [mx], distance, cancel }) => {
    // If dragging, cancel any pending single-tap timers
    if (distance > 5 && clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    api.start({ xOffset: mx });
  }, { from: () => [xOffset.get(), 0] });

  // SVG dimensions
  const width = 390;
  const height = 150;
  const amplitude = 30; // Height of the wave
  const frequency = 0.05; // How many waves
  const segments = 100; // How many points to draw the curve

  const generatePath = (offset, viewOffset) => {
    return viewOffset.to(v => {
      let path = `M 0 ${height / 2 + Math.sin(offset + v * frequency) * amplitude}`;
      for (let i = 0; i <= segments; i++) {
        const x = (width / segments) * i;
        const y = height / 2 + Math.sin(offset + (i + v) * frequency) * amplitude;
        path += ` L ${x} ${y}`;
      }
      return path;
    });
  };

  const path1 = generatePath(0, xOffset);
  const path2 = generatePath(Math.PI, xOffset);

  return (
    <div className="double-helix-container" {...bind()} style={{ touchAction: 'pan-x' }}>
      <svg className="double-helix-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hide tooltip when scrubbing */}
        <rect width={width} height={height} fill="transparent" onPointerDown={() => setActiveOrb(null)} />

        <animated.path d={path1} className="helix-strand" />
        <animated.path d={path2} className="helix-strand" />

        {orbs.map((orb, index) => {
          const progress = index / (orbs.length - 1);
          const x = width * progress;
          const strandOffset = index % 2 === 0 ? 0 : Math.PI;

          const cy = xOffset.to(v =>
            height / 2 + Math.sin(strandOffset + ((x/width * segments) + v) * frequency) * amplitude
          );

          return (
            <animated.circle
              key={orb.id}
              cx={x}
              cy={cy}
              r="8"
              className={`helix-orb orb-status-${orb.status}`}
              onClick={() => handleOrbClick(orb, x, cy.get())}
            />
          );
        })}

        {activeOrb && (
          <g className="tooltip">
            <rect
              x={activeOrb.x - 60}
              y={activeOrb.cy - 50}
              width="120"
              height="40"
              rx="5"
              className="tooltip-bg"
            />
            <text x={activeOrb.x} y={activeOrb.cy - 32} className="tooltip-title">{activeOrb.title}</text>
            <text x={activeOrb.x} y={activeOrb.cy - 18} className="tooltip-desc">{activeOrb.description}</text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default DoubleHelix;
