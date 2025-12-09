import React from 'react';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import './Rezzler.css';

// Placeholder data
const placeholderPetals = [
  { id: 1, type: 'realm', title: 'Crystal Caverns' },
  { id: 2, type: 'manifestation', title: 'Holographic UI' },
  { id: 3, type: 'completed', title: 'Community Onboarding' },
  { id: 4, type: 'blocked', title: 'Governance Module' },
  { id: 5, type: 'realm', title: 'Astral Plane' },
];

const placeholderOrbs = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  health: Math.random(),
}));


const Rezzler = () => {
  return (
    <div className="rezzler-container">
      <div className="lotus-blossom-wrapper">
        <LotusBlossom petals={placeholderPetals} />
      </div>
      <div className="double-helix-wrapper">
        <DoubleHelix orbs={placeholderOrbs} />
      </div>
    </div>
  );
};

export default Rezzler;
