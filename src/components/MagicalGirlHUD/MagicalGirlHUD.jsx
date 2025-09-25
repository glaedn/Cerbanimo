import React, { useState } from 'react';
import {
  MagicalGirlHUDContainer,
  InnerSanctumPanel,
  MysticalMirrorPanel,
  QuestsPanel,
  AstrasJournalPanel,
  AffinityWebPanel,
  MapViewort,
  StatusBarWrapper,
  MapToggleButton,
} from './MagicalGirlHUD.styles';
import TheInnerSanctum from './panels/TheInnerSanctum';
import AstrasJournal from './panels/AstrasJournal';
import Quests from './panels/Quests';
import AffinityWeb from './panels/AffinityWeb';
import MysticalMirror from './panels/MysticalMirror';

const MagicalGirlHUD = ({ children }) => {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState(null);

  const toggleMap = () => {
    setIsMapExpanded(!isMapExpanded);
  };

  const handlePanelClick = (panelName) => {
    setExpandedPanel(expandedPanel === panelName ? null : panelName);
  };

  const panelComponents = {
    innerSanctum: TheInnerSanctum,
    mysticalMirror: MysticalMirror,
    quests: Quests,
    astrasJournal: AstrasJournal,
    affinityWeb: AffinityWeb,
  };

  const panelContainers = {
    innerSanctum: InnerSanctumPanel,
    mysticalMirror: MysticalMirrorPanel,
    quests: QuestsPanel,
    astrasJournal: AstrasJournalPanel,
    affinityWeb: AffinityWebPanel,
  };

  const handleOutsideClick = (e) => {
    if (expandedPanel && !e.target.closest('.hud-panel')) {
      setExpandedPanel(null);
    }
  };

  useEffect(() => {
    if (expandedPanel) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [expandedPanel]);

  const renderPanel = (panelName) => {
    if (expandedPanel && expandedPanel !== panelName) {
      return null;
    }
    const PanelContainer = panelContainers[panelName];
    const PanelComponent = panelComponents[panelName];
    return (
      <PanelContainer className="hud-panel">
        <PanelComponent
          isExpanded={expandedPanel === panelName}
          onToggle={() => handlePanelClick(panelName)}
        />
      </PanelContainer>
    );
  };

  return (
    <MagicalGirlHUDContainer>
      {renderPanel('innerSanctum')}
      {renderPanel('mysticalMirror')}
      {renderPanel('quests')}
      {renderPanel('astrasJournal')}
      {renderPanel('affinityWeb')}
      <MapViewort isExpanded={isMapExpanded} onClick={!isMapExpanded ? toggleMap : undefined}>
        {isMapExpanded && children}
        <MapToggleButton onClick={isMapExpanded ? toggleMap : undefined}>
          {isMapExpanded ? 'Minimize' : 'Expand'}
        </MapToggleButton>
      </MapViewort>
    </MagicalGirlHUDContainer>
  );
};

export default MagicalGirlHUD;
