import React from 'react';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import './Rezzler.css';

const Rezzler = () => {
  return (
    <div className="rezzler-container">
      <LotusBlossom />
      <DoubleHelix />
    </div>
  );
};

export default Rezzler;
