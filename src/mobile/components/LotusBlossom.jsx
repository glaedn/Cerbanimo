import React from 'react';
import './LotusBlossom.css';
import petal from '../assets/petal.png';

const LotusBlossom = () => {
  return (
    <div className="lotus-blossom">
      <img src={petal} alt="petal" className="petal petal-1" />
      <img src={petal} alt="petal" className="petal petal-2" />
      <img src={petal} alt="petal" className="petal petal-3" />
      <img src={petal} alt="petal" className="petal petal-4" />
      <img src={petal} alt="petal" className="petal petal-5" />
    </div>
  );
};

export default LotusBlossom;
