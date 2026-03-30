import React, { useState, useEffect } from 'react';
import ImpactGraph from '../components/HUD/ImpactGraph/ImpactGraph';
import './ImpactAtlas.css';

const ImpactAtlas = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="impact-atlas-container">
      <div className="hud-header">
        <h1 className="hud-title">IMPACT ATLAS [GLOBAL]</h1>
        <div className="hud-status">STATUS: SYNCHRONIZING_IMPACT_GRAPHS...</div>
      </div>
      <div className="atlas-main">
        <ImpactGraph
            width={windowSize.width * 0.9}
            height={windowSize.height * 0.8}
        />
      </div>
      <div className="hud-footer">
        <div className="hud-legend">
          <span className="legend-item outcome">OUTCOME</span>
          <span className="legend-item project">PROJECT</span>
          <span className="legend-item task">TASK</span>
        </div>
      </div>
    </div>
  );
};

export default ImpactAtlas;
