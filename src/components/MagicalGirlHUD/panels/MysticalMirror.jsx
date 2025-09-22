import React, { useState } from 'react';
import useRelevantQuests from '../../../hooks/useRelevantQuests';
import { useUserProfile } from '../../../hooks/useUserProfile';
import {
  MirrorContainer,
  MirrorImageContainer,
  MirrorImage,
  ActiveMirrorImage,
  MirrorContent,
  MirrorHeader,
  MirrorTitle,
} from './MysticalMirror.styles';
import MirrorIcon from '../../../assets/magical-girl/mystical-mirror.png';
import MirrorActiveIcon from '../../../assets/magical-girl/mystical-mirror-active.png';

const MysticalMirror = () => {
  const { profile } = useUserProfile();
  const { relevantQuests, loading: questsLoading, error: questsError } = useRelevantQuests(profile?.id);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (questsLoading) {
    return <MirrorContainer>Gazing into the mystical mirror...</MirrorContainer>;
  }

  if (questsError) {
    return <MirrorContainer>The mirror's surface is clouded.</MirrorContainer>;
  }

  return (
    <MirrorContainer onClick={toggleExpand} isExpanded={isExpanded}>
      <MirrorImageContainer>
        <MirrorImage src={MirrorIcon} alt="Mystical Mirror" />
      </MirrorImageContainer>
      {isExpanded && (
        <>
          <ActiveMirrorImage src={MirrorActiveIcon} alt="Mystical Mirror Active" />
          <MirrorContent>
            <MirrorHeader>
              <MirrorTitle>Mystical Mirror</MirrorTitle>
            </MirrorHeader>
            {relevantQuests.length > 0 ? (
              <ul>
                {relevantQuests.map((quest) => (
                  <li key={quest.id}>
                    <p>{quest.name}</p>
                    <button>Accept Quest</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>The mirror shows no pressing matters.</p>
            )}
          </MirrorContent>
        </>
      )}
    </MirrorContainer>
  );
};

export default MysticalMirror;
