import React from 'react';
import {
  QuestsContainer,
  ScrollImage,
  ActiveScrollImage,
  QuestsContent,
} from './Quests.styles';
import ScrollIcon from '../../../assets/magical-girl/quests-scroll.png';
import ScrollActiveIcon from '../../../assets/magical-girl/quests-scroll-active.png';
import MissionConsole from '../../HUD/panels/MissionConsole';

const Quests = ({ isExpanded, onToggle }) => {
  return (
    <QuestsContainer onClick={onToggle} isExpanded={isExpanded}>
      <ScrollImage src={ScrollIcon} alt="Quests Scroll" isExpanded={isExpanded} />
      {isExpanded && (
        <>
          <ActiveScrollImage src={ScrollActiveIcon} alt="Quests Scroll Open" />
          <QuestsContent>
            <MissionConsole />
          </QuestsContent>
        </>
      )}
    </QuestsContainer>
  );
};

export default Quests;