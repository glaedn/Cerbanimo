import React from 'react';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import RootTasks from './components/RootTasks';
import Label from './components/Label';
import { dummyData } from './dummyData';
import './Rezzler.css';

const Rezzler = () => {
  return (
    <div className="rezzler-container">
      <Label text="Global Makers Society" position="top" />
      <LotusBlossom />
      <DoubleHelix />
      <RootTasks />
    </div>
  );
};

export default Rezzler;
