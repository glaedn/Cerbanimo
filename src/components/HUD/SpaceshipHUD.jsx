import React, { useState } from 'react';
import './SpaceshipHUD.css';
import CommandDeck from './panels/CommandDeck';
import MissionConsole from './panels/MissionConsole';
import TargetingScanner from './panels/TargetingScanner';
import CommsLog from './panels/CommsLog';
import StatusBar from './panels/StatusBar';
import SkillGalaxyPanel from './panels/SkillGalaxyPanel'; // Renamed import
// import HUDSettingsPanel from './panels/HUDSettingsPanel'; // Removed
import { useWindowSize } from '../../hooks/useWindowSize.js'; // Adjust path

const SpaceshipHUD = ({ children }) => {
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  // const [panelVisibility, setPanelVisibility] = useState({ // Removed
  //   commandDeck: true,
  //   missionConsole: true,
  //   targetingScanner: true,
  //   commsLog: true,
  //   skillGalaxy: true,
  // });

  // const togglePanel = (panelName) => { // Removed
  //   setPanelVisibility(prev => ({ ...prev, [panelName]: !prev[panelName] }));
  // };

  // Default positions for panels - adjust as needed for initial layout
  const settingsPanelStyle = {
    position: 'fixed',
    top: isMobile ? '10px' : '60px', // Higher on mobile if map is at top
    right: '10px',
    zIndex: 105, // Ensure settings panel is above map tooltips (which are z-index 100)
    width: isMobile ? 'calc(100% - 20px)' : 'auto', // Full width on mobile, auto on desktop
    maxWidth: isMobile ? '300px' : 'none', // Max width on mobile
  };
  
  return (
    <div className={`hud-container ${isMobile ? 'mobile-hud' : ''}`}>
      {/* Settings Panel - Removed */}
      {/* <div style={settingsPanelStyle} className="hud-settings-panel-wrapper">
        <HUDSettingsPanel panelVisibility={panelVisibility} togglePanel={togglePanel} />
      </div> */}

      {/* Panels - Always rendered, internal state will control minimization */}
      <div className={`panel-wrapper command-deck-panel`}>
        <CommandDeck />
      </div>
      
      <div className={`panel-wrapper targeting-scanner-panel`}>
        <TargetingScanner />
      </div>

      <div className={`panel-wrapper mission-console-panel`}>
        <MissionConsole />
      </div>

      <div className={`panel-wrapper comms-log-panel`}>
        <CommsLog />
      </div>

      <div className={`panel-wrapper skill-galaxy-panel`}>
        <SkillGalaxyPanel />
      </div>
      
      {/* Central Map Viewport */}
      <div className="hud-map-viewport">
        {children}
      </div>
      
      {/* Static Status Bar - Not Draggable */}
      <StatusBar />
    </div>
  );
};
export default SpaceshipHUD;
