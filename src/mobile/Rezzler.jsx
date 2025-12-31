import React from 'react';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import RootTasks from './components/RootTasks';
import './Rezzler.css';

const spineHeight = Math.min(window.innerHeight, 700);


const Rezzler = () => {
  const spineHeight = Math.min(window.innerHeight, 700);

  return (
    <div className="rezzler-container">
      <LotusBlossom spineHeight={spineHeight} />
      <DoubleHelix spineHeight={spineHeight} />
      <RootTasks spineHeight={spineHeight} />
    </div>
  );
};


export default Rezzler;
