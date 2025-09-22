import React, { useState } from 'react';
import { useNotifications } from '../../pages/NotificationProvider';
import './Astra.css';
import AstraIcon from '../../assets/astra.svg';
import theme from '../../../styles/theme';

const Astra = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const toggleAstra = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  };

  return (
    <div className={`astra-container ${isOpen ? 'open' : ''}`}>
      <div className="astra-icon-container" onClick={toggleAstra}>
        <img src={AstraIcon} alt="Astra" className="astra-icon" />
        {unreadCount > 0 && <div className="astra-badge">{unreadCount}</div>}
      </div>
      {isOpen && (
        <div className="astra-notifications">
          <div className="astra-speech-bubble">
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <div key={notif.id} className="astra-notification">
                  {notif.messageText}
                </div>
              ))
            ) : (
              <div className="astra-notification">No new transmissions.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Astra;
