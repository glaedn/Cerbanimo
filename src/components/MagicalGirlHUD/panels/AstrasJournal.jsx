import React from 'react';
import {
  JournalContainer,
  JournalImage,
  ActiveJournalImage,
  JournalContent,
} from './AstrasJournal.styles';
import JournalIcon from '../../../assets/magical-girl/astras-journal.png';
import JournalActiveIcon from '../../../assets/magical-girl/astras-journal-active.png';
import CommsLog from '../../HUD/panels/CommsLog';
import { useNotifications } from '../../../pages/NotificationProvider';

const AstrasJournal = ({ isExpanded, onToggle }) => {
  const { unreadCount } = useNotifications();
  return (
    <JournalContainer onClick={onToggle} isExpanded={isExpanded}>
      <JournalImage src={JournalIcon} alt="Astra's Journal" isExpanded={isExpanded} hasNew={unreadCount > 0} />
      {isExpanded && (
        <>
          <ActiveJournalImage src={JournalActiveIcon} alt="Astra's Journal Open" />
          <JournalContent>
            <CommsLog showHeader={false} />
          </JournalContent>
        </>
      )}
    </JournalContainer>
  );
};

export default AstrasJournal;