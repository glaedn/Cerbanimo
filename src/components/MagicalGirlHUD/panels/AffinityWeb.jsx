import React, { useState } from 'react';
import {
  AffinityWebContainer,
  OrbImage,
  ActiveOrbImage,
  AffinityWebWrapper,
} from './AffinityWeb.styles';
import OrbIcon from '../../../assets/magical-girl/affinity-orb.png';
import OrbActiveIcon from '../../../assets/magical-girl/affinity-orb-active.png';
import AffinityGalaxyPanel from '../../HUD/panels/AffinityGalaxyPanel';

const AffinityWeb = ({ isExpanded, onToggle }) => {
  return (
    <AffinityWebContainer onClick={onToggle} isExpanded={isExpanded}>
      <OrbImage src={OrbIcon} alt="Affinity Orb" isExpanded={isExpanded} />
      {isExpanded && (
        <AffinityWebWrapper>
          <ActiveOrbImage src={OrbActiveIcon} alt="Affinity Web" />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <AffinityGalaxyPanel isCircular={true} />
          </div>
        </AffinityWebWrapper>
      )}
    </AffinityWebContainer>
  );
};

export default AffinityWeb;