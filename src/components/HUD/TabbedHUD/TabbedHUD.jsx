import React, { useState } from 'react';
import MissionConsole from '../panels/MissionConsole';
import TargetingScanner from '../panels/TargetingScanner';
import DisputeCourt from '../../../pages/DisputeCourt/DisputeCourt';
import ImpactAtlas from '../../../pages/ImpactAtlas';
import './TabbedHUD.css';

const TabbedHUD = () => {
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
    <div className="tabbed-hud-container">
      <div className="hud-content-area">
        {renderActivePanel()}
      </div>

      <div className="hud-tab-bar">
        <button
          className={activeTab === 'missions' ? 'active' : ''}
          onClick={() => setActiveTab('missions')}
        >
          MISSIONS
        </button>
        <button
          className={activeTab === 'scanner' ? 'active' : ''}
          onClick={() => setActiveTab('scanner')}
        >
          SCANNER
        </button>
        <button
          className={activeTab === 'court' ? 'active' : ''}
          onClick={() => setActiveTab('court')}
        >
          COURT
        </button>
        <button
          className={activeTab === 'atlas' ? 'active' : ''}
          onClick={() => setActiveTab('atlas')}
        >
          ATLAS
        </button>
      </div>
    </div>
  );
};

export default TabbedHUD;
