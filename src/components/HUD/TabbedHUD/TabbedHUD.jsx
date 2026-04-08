import React, { useState } from 'react';
import MissionConsole from '../panels/MissionConsole';
import TargetingScanner from '../panels/TargetingScanner';
import DisputeCourt from '../../../pages/DisputeCourt/DisputeCourt';
import ImpactAtlas from '../../../pages/ImpactAtlas';
import { useIsMobile } from '../../../hooks/useIsMobile';
import './TabbedHUD.css';

const TabbedHUD = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('missions');

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'missions': return <MissionConsole />;
      case 'scanner': return <TargetingScanner />;
      case 'court': return <DisputeCourt />;
      case 'atlas': return <ImpactAtlas />;
      default: return <MissionConsole />;
    }
  };

  return (
    <div className={`tabbed-hud-container ${isMobile ? 'mobile-hud' : ''}`}>
      <div className="hud-content-area">
        {renderActivePanel()}
      </div>

      <div className="hud-tab-bar" style={{ height: isMobile ? '72px' : '60px', paddingBottom: isMobile ? '12px' : '0' }}>
        <button
          className={activeTab === 'missions' ? 'active' : ''}
          onClick={() => setActiveTab('missions')}
          style={{ height: isMobile ? '48px' : 'auto', fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          {isMobile ? 'MISSN' : 'MISSIONS'}
        </button>
        <button
          className={activeTab === 'scanner' ? 'active' : ''}
          onClick={() => setActiveTab('scanner')}
          style={{ height: isMobile ? '48px' : 'auto', fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          {isMobile ? 'SCNR' : 'SCANNER'}
        </button>
        <button
          className={activeTab === 'court' ? 'active' : ''}
          onClick={() => setActiveTab('court')}
          style={{ height: isMobile ? '48px' : 'auto', fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          {isMobile ? 'COURT' : 'COURT'}
        </button>
        <button
          className={activeTab === 'atlas' ? 'active' : ''}
          onClick={() => setActiveTab('atlas')}
          style={{ height: isMobile ? '48px' : 'auto', fontSize: isMobile ? '0.7rem' : 'inherit' }}
        >
          {isMobile ? 'ATLAS' : 'ATLAS'}
        </button>
      </div>
    </div>
  );
};

export default TabbedHUD;
