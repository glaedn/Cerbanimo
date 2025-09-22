import React from 'react';
import {
  HUDContainer,
  CommandDeckPanel,
  TargetingScannerPanel,
  MissionConsolePanel,
  CommsLogPanel,
  AffinityGalaxyPanelWrapper,
  HUDMapViewort,
  StatusBarWrapper,
} from './SpaceshipHUD.styles';
import CommandDeck from './panels/CommandDeck';
import MissionConsole from './panels/MissionConsole';
import TargetingScanner from './panels/TargetingScanner';
import CommsLog from './panels/CommsLog';
import StatusBar from './panels/StatusBar';
import AffinityGalaxyPanel from './panels/AffinityGalaxyPanel'; // Renamed import
// import HUDSettingsPanel from './panels/HUDSettingsPanel'; // Removed
import { useWindowSize } from '../../hooks/useWindowSize.js'; // Adjust path

const SpaceshipHUD = ({ children }) => {
  return (
    <HUDContainer>
      <CommandDeckPanel>
        <CommandDeck />
      </CommandDeckPanel>
      
      <TargetingScannerPanel>
        <TargetingScanner />
      </TargetingScannerPanel>

      <MissionConsolePanel>
        <MissionConsole />
      </MissionConsolePanel>

      <CommsLogPanel>
        <CommsLog />
      </CommsLogPanel>

      <AffinityGalaxyPanelWrapper>
        <AffinityGalaxyPanel />
      </AffinityGalaxyPanelWrapper>
      
      <HUDMapViewort>
        {children}
      </HUDMapViewort>
      
      <StatusBarWrapper>
        <StatusBar />
      </StatusBarWrapper>
    </HUDContainer>
  );
};
export default SpaceshipHUD;
