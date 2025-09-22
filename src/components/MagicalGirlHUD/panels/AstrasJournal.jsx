import React, { useState } from 'react';
import { useNotifications } from '../../../pages/NotificationProvider';
import { useTheme } from '@mui/material/styles';
import {
  JournalContainer,
  JournalImage,
  ActiveJournalImage,
  JournalContent,
  JournalHeader,
  JournalTitle,
} from './AstrasJournal.styles';
import JournalIcon from '../../../assets/magical-girl/astras-journal.png';
import JournalActiveIcon from '../../../assets/magical-girl/astras-journal-active.png';

const AstrasJournal = () => {
  const { notifications, unreadCount } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <JournalContainer onClick={toggleExpand} isExpanded={isExpanded}>
      <JournalImage src={JournalIcon} alt="Astra's Journal" isExpanded={isExpanded} hasNew={unreadCount > 0} />
      {isExpanded && (
        <>
          <ActiveJournalImage src={JournalActiveIcon} alt="Astra's Journal Open" />
          <JournalContent>
            <JournalHeader>
              <JournalTitle>
                {unreadCount > 0
                  ? theme.terminology.new_notifications_message
                  : "Astra's Journal"}
              </JournalTitle>
            </JournalHeader>
            {notifications && notifications.length > 0 ? (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>{notification.messageText}</li>
                ))}
              </ul>
            ) : (
              <p>Astra has nothing new to report.</p>
            )}
          </JournalContent>
        </>
      )}
    </JournalContainer>
  );
};

export default AstrasJournal;
