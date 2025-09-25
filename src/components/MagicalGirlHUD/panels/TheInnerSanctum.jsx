import React from 'react';
import {
  PanelContainer,
  ShrineImage,
  ActiveShrineImage,
  PanelContent,
} from './TheInnerSanctum.styles';
import InnerSanctumIcon from '../../../assets/magical-girl/The-Inner-Sanctum.png';
import InnerSanctumActiveIcon from '../../../assets/magical-girl/The-Inner-Sanctum-Active.png';
import CommandDeck from '../../HUD/panels/CommandDeck';

const TheInnerSanctum = ({ isExpanded, onToggle }) => {
  return (
    <PanelContainer onClick={onToggle} isExpanded={isExpanded}>
      <ShrineImage src={InnerSanctumIcon} alt="The Inner Sanctum" isExpanded={isExpanded} />
      {isExpanded && (
        <>
          <ActiveShrineImage src={InnerSanctumActiveIcon} alt="The Inner Sanctum Active" />
          <PanelContent>
            <CommandDeck />
          </PanelContent>
        </>
      )}
    </PanelContainer>
  );
};

export default TheInnerSanctum;