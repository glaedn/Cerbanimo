import React from 'react';
import {
  MirrorContainer,
  MirrorImageContainer,
  MirrorImage,
  ActiveMirrorImage,
  MirrorContent,
} from './MysticalMirror.styles';
import MirrorIcon from '../../../assets/magical-girl/mystical-mirror.png';
import MirrorActiveIcon from '../../../assets/magical-girl/mystical-mirror-active.png';
import TargetingScanner from '../../HUD/panels/TargetingScanner';

const MysticalMirror = ({ isExpanded, onToggle }) => {
  return (
    <MirrorContainer onClick={onToggle} isExpanded={isExpanded}>
      <MirrorImageContainer>
        <MirrorImage src={MirrorIcon} alt="Mystical Mirror" />
      </MirrorImageContainer>
      {isExpanded && (
        <>
          <ActiveMirrorImage src={MirrorActiveIcon} alt="Mystical Mirror Active" />
          <MirrorContent>
            <TargetingScanner showHeader={false} />
          </MirrorContent>
        </>
      )}
    </MirrorContainer>
  );
};

export default MysticalMirror;