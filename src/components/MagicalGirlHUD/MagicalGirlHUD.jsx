import React from 'react';
import {
  MagicalGirlHUDContainer,
  InnerSanctumPanel,
  MysticalMirrorPanel,
  QuestsPanel,
  AstrasJournalPanel,
  AffinityWebPanel,
  MapViewort,
  StatusBarWrapper,
} from './MagicalGirlHUD.styles';
import TheInnerSanctum from './panels/TheInnerSanctum';
import AstrasJournal from './panels/AstrasJournal';
import Quests from './panels/Quests';
import AffinityWeb from './panels/AffinityWeb';
import MysticalMirror from './panels/MysticalMirror';

const MagicalGirlHUD = ({ children }) => {
  return (
    <MagicalGirlHUDContainer>
      <InnerSanctumPanel>
        <TheInnerSanctum />
      </InnerSanctumPanel>
      <MysticalMirrorPanel>
        <MysticalMirror />
      </MysticalMirrorPanel>
      <QuestsPanel>
        <Quests />
      </QuestsPanel>
      <AstrasJournalPanel>
        <AstrasJournal />
      </AstrasJournalPanel>
      <AffinityWebPanel>
        <AffinityWeb />
      </AffinityWebPanel>
      <MapViewort>
        {children}
      </MapViewort>
    </MagicalGirlHUDContainer>
  );
};

export default MagicalGirlHUD;
