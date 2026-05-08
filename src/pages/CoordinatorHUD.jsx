import React from 'react';
import AdaptiveHUD from '../components/HUD/AdaptiveHUD';
import GalacticActivityMap from '../components/GalacticActivityMap/GalacticActivityMap';

const CoordinatorHUD = () => {
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000' }}>
      <AdaptiveHUD>
        <GalacticActivityMap />
      </AdaptiveHUD>
    </div>
  );
};

export default CoordinatorHUD;
