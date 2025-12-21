import React from 'react';
import './DoubleHelix.css';

const DoubleHelix = () => {
  return (
    <div className="double-helix">
      <svg width="350" height="60" viewBox="0 0 350 60">
        {/* The main helix path (a sine wave) */}
        <path
          d="M 10 30 C 40 10, 70 10, 100 30 S 160 50, 190 30 S 250 10, 280 30 S 340 50, 370 30"
          stroke="white"
          strokeWidth="2"
          fill="none"
          className="helix-strand"
        />
        {/* The second helix path, offset */}
        <path
          d="M 10 30 C 40 50, 70 50, 100 30 S 160 10, 190 30 S 250 50, 280 30 S 340 10, 370 30"
          stroke="white"
          strokeWidth="2"
          fill="none"
          className="helix-strand"
        />

        {/* Orbs */}
        <circle cx="55" cy="30" r="8" fill="#FF8FAB" className="helix-orb" />
        <circle cx="145" cy="30" r="8" fill="#FF8FAB" className="helix-orb" />
        <circle cx="235" cy="30" r="8" fill="#FF8FAB" className="helix-orb" />
        <circle cx="325" cy="30" r="8" fill="#FF8FAB" className="helix-orb" />

        {/* End Caps */}
        <path d="M 0 30 L 10 25 L 10 35 Z" fill="white" />
        <path d="M 380 30 L 370 25 L 370 35 Z" fill="white" />
      </svg>
    </div>
  );
};

export default DoubleHelix;
