import React from 'react';
import LotusBlossom from './components/LotusBlossom';
import DoubleHelix from './components/DoubleHelix';
import RootTasks from './components/RootTasks';
import Label from './components/Label';
import { dummyData } from './dummyData';
import './Rezzler.css';

const Rezzler = () => {
  const bottomTask = dummyData.rootTasks.nodes.find(node => node.title === 'Fix the gutters');

  return (
    <div className="rezzler-container">
      <LotusBlossom />
      <DoubleHelix />
      <RootTasks />
      {bottomTask && <Label text={bottomTask.title} position="bottom" />}
    </div>
  );
};

export default Rezzler;
