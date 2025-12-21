import React from 'react';
import { dummyData } from '../dummyData';
import './DoubleHelix.css';

const { orbs } = dummyData.doubleHelix;

const DoubleHelix = () => {
  // SVG dimensions
  const width = 390;
  const height = 150;
  const amplitude = 30; // Height of the wave
  const frequency = 0.05; // How many waves
  const segments = 100; // How many points to draw the curve

  // Function to generate the points for a sine wave path
  const generatePath = (offset) => {
    let path = `M 0 ${height / 2 + Math.sin(offset) * amplitude}`;
    for (let i = 0; i <= segments; i++) {
      const x = (width / segments) * i;
      const y = height / 2 + Math.sin(offset + i * frequency) * amplitude;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  const path1 = generatePath(0);
  const path2 = generatePath(Math.PI); // Offset by PI for the second strand

  return (
    <div className="double-helix-container">
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

        {/* Render the two helix strands */}
        <path d={path1} className="helix-strand" />
        <path d={path2} className="helix-strand" />

        {/* Render the orbs */}
        {orbs.map((orb, index) => {
          const progress = index / (orbs.length - 1);
          const x = width * progress;
          // Alternate orbs on different strands
          const strandOffset = index % 2 === 0 ? 0 : Math.PI;
          const y = height / 2 + Math.sin(strandOffset + (x / width) * (segments * frequency)) * amplitude;

          return (
            <circle
              key={orb.id}
              cx={x}
              cy={y}
              r="6"
              className={`helix-orb orb-status-${orb.status}`}
            />
          );
        })}
      </svg>
    </div>
  );
};

export default DoubleHelix;
