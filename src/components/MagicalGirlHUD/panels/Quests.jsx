import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAssignedQuests from '../../../hooks/useAssignedQuests';
import { useUserProfile } from '../../../hooks/useUserProfile';
import {
  QuestsContainer,
  ScrollImage,
  ActiveScrollImage,
  QuestsContent,
  QuestsHeader,
  QuestsTitle,
} from './Quests.styles';
import ScrollIcon from '../../../assets/magical-girl/quests-scroll.png';
import ScrollActiveIcon from '../../../assets/magical-girl/quests-scroll-active.png';

const Quests = () => {
  const { profile } = useUserProfile();
  const { assignedQuests, loading: questsLoading, error: questsError } = useAssignedQuests(profile?.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleViewQuest = (quest) => {
    navigate(`/visualizer/${quest.projectId}/${quest.id}`);
  };

  if (questsLoading) {
    return <QuestsContainer>Loading Quests...</QuestsContainer>;
  }

  if (questsError) {
    return <QuestsContainer>Error loading quests.</QuestsContainer>;
  }

  return (
    <QuestsContainer onClick={toggleExpand} isExpanded={isExpanded}>
      <ScrollImage src={ScrollIcon} alt="Quests Scroll" isExpanded={isExpanded} />
      {isExpanded && (
        <>
          <ActiveScrollImage src={ScrollActiveIcon} alt="Quests Scroll Open" />
          <QuestsContent>
            <QuestsHeader>
              <QuestsTitle>Your Quests</QuestsTitle>
            </QuestsHeader>
            {assignedQuests.length > 0 ? (
              <ul>
                {assignedQuests.map((quest) => (
                  <li key={quest.id}>
                    <p>{quest.name}</p>
                    <button onClick={() => handleViewQuest(quest)}>View Quest</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No quests accepted.</p>
            )}
          </QuestsContent>
        </>
      )}
    </QuestsContainer>
  );
};

export default Quests;
