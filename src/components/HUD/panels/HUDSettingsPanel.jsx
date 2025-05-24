import React from 'react';
import '../HUDPanel.css'; // Assuming general panel styles

const HUDSettingsPanel = ({ panelVisibility, togglePanel }) => {
  return (
    <div className="hud-panel hud-settings-panel" style={{ width: '250px' /* Example width */ }}>
      <h4>HUD Settings</h4>
      <button onClick={() => togglePanel('commandDeck')}>
        {panelVisibility.commandDeck ? 'Hide' : 'Show'} Command Deck
      </button>
      <button onClick={() => togglePanel('missionConsole')}>
        {panelVisibility.missionConsole ? 'Hide' : 'Show'} Mission Console
      </button>
      <button onClick={() => togglePanel('targetingScanner')}>
        {panelVisibility.targetingScanner ? 'Hide' : 'Show'} Targeting Scanner
      </button>
      <button onClick={() => togglePanel('commsLog')}>
        {panelVisibility.commsLog ? 'Hide' : 'Show'} Comms Log
      </button>
      <button onClick={() => togglePanel('skillGalaxy')}>
        {panelVisibility.skillGalaxy ? 'Hide' : 'Show'} Skill Galaxy
      </button>
      {/* Add more buttons as needed */}
    </div>
  );
};

export default HUDSettingsPanel;
