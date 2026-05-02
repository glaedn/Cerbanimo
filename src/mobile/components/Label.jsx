import React from 'react';
import './Label.css';

const Label = ({ text, position }) => {
  return (
    <div className={`label-container ${position}`}>
      {text}
    </div>
  );
};

export default Label;
