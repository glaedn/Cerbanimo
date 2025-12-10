import React from 'react';
import './DoubleHelix.css';
import helix from '../assets/double-helix.png';

const DoubleHelix = () => {
  return (
    <div className="double-helix">
      <img src={helix} alt="double helix" className="helix-image" />
    </div>
  );
};

export default DoubleHelix;
