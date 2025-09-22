import React, { useState } from 'react';
import useAffinityData from '../../../hooks/useAffinityData';
import { useUserProfile } from '../../../hooks/useUserProfile';
import {
  AffinityWebContainer,
  OrbImage,
  ActiveOrbImage,
  AffinityWebWrapper,
  AffinityWebHeader,
  AffinityWebTitle,
} from './AffinityWeb.styles';
import OrbIcon from '../../../assets/magical-girl/affinity-orb.png';
import OrbActiveIcon from '../../../assets/magical-girl/affinity-orb-active.png';

const AffinityWeb = () => {
  const { allAffinities, loading: affinitiesLoading, error: affinitiesError } = useAffinityData();
  const { profile } = useUserProfile();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (affinitiesLoading) {
    return <AffinityWebContainer>Loading Affinities...</AffinityWebContainer>;
  }

  if (affinitiesError) {
    return <AffinityWebContainer>Error loading affinities.</AffinityWebContainer>;
  }

  return (
    <AffinityWebContainer onClick={toggleExpand} isExpanded={isExpanded}>
      <OrbImage src={OrbIcon} alt="Affinity Orb" isExpanded={isExpanded} />
      {isExpanded && (
        <AffinityWebWrapper>
          <ActiveOrbImage src={OrbActiveIcon} alt="Affinity Web" />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <AffinityWebHeader>
              <AffinityWebTitle>Affinity Web</AffinityWebTitle>
            </AffinityWebHeader>
            {/* Simplified content for now, will replace with a more fitting visualization later */}
            <ul>
              {allAffinities.slice(0, 5).map(affinity => (
                <li key={affinity.id}>{affinity.name}</li>
              ))}
            </ul>
          </div>
        </AffinityWebWrapper>
      )}
    </AffinityWebContainer>
  );
};

export default AffinityWeb;
