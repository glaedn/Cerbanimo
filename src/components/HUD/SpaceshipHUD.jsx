import React, { useState } from 'react';
import Draggable from 'react-draggable';
import './SpaceshipHUD.css';
import CommandDeck from './panels/CommandDeck';
import MissionConsole from './panels/MissionConsole';
import TargetingScanner from './panels/TargetingScanner';
import CommsLog from './panels/CommsLog';
import StatusBar from './panels/StatusBar';
import SkillGalaxy from './panels/SkillGalaxy';
import HUDSettingsPanel from './panels/HUDSettingsPanel';
import { useWindowSize } from '../../../hooks/useWindowSize'; // Adjust path

const SpaceshipHUD = ({ children }) => {
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const [panelVisibility, setPanelVisibility] = useState({
    commandDeck: true,
    missionConsole: true,
    targetingScanner: true,
    commsLog: true,
    skillGalaxy: true,
  });

  const togglePanel = (panelName) => {
    setPanelVisibility(prev => ({ ...prev, [panelName]: !prev[panelName] }));
  };

  // Default positions for panels - adjust as needed for initial layout
  // These might need to be more dynamic based on screen size or stored user preferences in a real app
  const defaultPositions = {
    commandDeck: { x: 50, y: 5 },
    targetingScanner: { x: 400, y: 5 },
    missionConsole: { x: 5, y: 150 },
    commsLog: { x: 5, y: 400 },
    skillGalaxy: { x: 800, y: 150 } // Example, might be a larger panel
  };

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
      {/* Settings Panel - Fixed Position, style adjusted for mobile */}
      <div style={settingsPanelStyle} className="hud-settings-panel-wrapper">
        <HUDSettingsPanel panelVisibility={panelVisibility} togglePanel={togglePanel} />
      </div>

      {/* Draggable Panels */}
      {panelVisibility.commandDeck && (
        <Draggable handle=".hud-panel-header" defaultPosition={defaultPositions.commandDeck} key="commandDeck" disabled={isMobile}>
          <div className={`panel-wrapper ${!panelVisibility.commandDeck ? 'hidden' : ''}`}>
            <CommandDeck />
          </div>
        </Draggable>
      )}
      
      {panelVisibility.targetingScanner && (
        <Draggable handle=".hud-panel-header" defaultPosition={defaultPositions.targetingScanner} key="targetingScanner" disabled={isMobile}>
          <div className={`panel-wrapper ${!panelVisibility.targetingScanner ? 'hidden' : ''}`}>
            <TargetingScanner />
          </div>
        </Draggable>
      )}

      {panelVisibility.missionConsole && (
        <Draggable handle=".hud-panel-header" defaultPosition={defaultPositions.missionConsole} key="missionConsole" disabled={isMobile}>
          <div className={`panel-wrapper ${!panelVisibility.missionConsole ? 'hidden' : ''}`}>
            <MissionConsole />
          </div>
        </Draggable>
      )}

      {panelVisibility.commsLog && (
        <Draggable handle=".hud-panel-header" defaultPosition={defaultPositions.commsLog} key="commsLog" disabled={isMobile}>
          <div className={`panel-wrapper ${!panelVisibility.commsLog ? 'hidden' : ''}`}>
            <CommsLog />
          </div>
        </Draggable>
      )}

      {panelVisibility.skillGalaxy && (
        <Draggable handle=".hud-panel-header" defaultPosition={defaultPositions.skillGalaxy} key="skillGalaxy" disabled={isMobile}>
          <div className={`panel-wrapper ${!panelVisibility.skillGalaxy ? 'hidden' : ''}`}>
            <SkillGalaxy />
          </div>
        </Draggable>
      )}
      
      {/* Central Map Viewport - Not Draggable */}
      <div className="hud-map-viewport">
        {children}
      </div>
      
      {/* Static Status Bar - Not Draggable */}
      <StatusBar />
    </div>
  );
};
export default SpaceshipHUD;
