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

  return (
    <MagicalGirlHUDContainer>
      <InnerSanctumPanel className={expandedPanel && expandedPanel !== 'innerSanctum' ? 'hidden' : ''}>
        <TheInnerSanctum isExpanded={expandedPanel === 'innerSanctum'} onToggle={() => handlePanelClick('innerSanctum')} />
      </InnerSanctumPanel>
      <MysticalMirrorPanel className={expandedPanel && expandedPanel !== 'mysticalMirror' ? 'hidden' : ''}>
        <MysticalMirror isExpanded={expandedPanel === 'mysticalMirror'} onToggle={() => handlePanelClick('mysticalMirror')} />
      </MysticalMirrorPanel>
      <QuestsPanel className={expandedPanel && expandedPanel !== 'quests' ? 'hidden' : ''}>
        <Quests isExpanded={expandedPanel === 'quests'} onToggle={() => handlePanelClick('quests')} />
      </QuestsPanel>
      <AstrasJournalPanel className={expandedPanel && expandedPanel !== 'astrasJournal' ? 'hidden' : ''}>
        <AstrasJournal isExpanded={expandedPanel === 'astrasJournal'} onToggle={() => handlePanelClick('astrasJournal')} />
      </AstrasJournalPanel>
      <AffinityWebPanel className={expandedPanel && expandedPanel !== 'affinityWeb' ? 'hidden' : ''}>
        <AffinityWeb isExpanded={expandedPanel === 'affinityWeb'} onToggle={() => handlePanelClick('affinityWeb')} />
      </AffinityWebPanel>
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
