import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import { useNotifications } from '../../../hooks/useNotifications'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
// import './CommsLog.css'; // Optional: For specific CommsLog styles

const CommsLog = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { notifications, loading: notificationsLoading, error: notificationsError } = useNotifications(profile?.id);

  if (profileLoading || notificationsLoading) return <div className="hud-panel comms-log">Loading Comms Log...</div>;
  if (profileError) return <div className="hud-panel comms-log">Error loading profile: {profileError.message}</div>;
  if (notificationsError) return <div className="hud-panel comms-log">Error loading notifications: {notificationsError.message}</div>;
  if (!profile) return <div className="hud-panel comms-log">User profile not available for comms.</div>;

  // Assuming notifications are sorted newest first by the hook or API
  return (
    <div className="hud-panel comms-log">
      <div className="hud-panel-header">
        <h4>Comms Log</h4>
      </div>
      {notifications.length > 0 ? (
        <ul>
          {notifications.map((notif, index) => (
            // Apply 'notification-item' for fadeIn animation. 
            // Could add logic to only animate "new" ones if state managed differently.
            <li 
              key={notif.id} 
              className="notification-item" 
              style={{ 
                color: notif.read ? '#CCCCCC' : '#FFFFFF', // theme.colors.textSecondary and textPrimary
                borderBottom: '1px dashed rgba(0, 243, 255, 0.2)', // theme.colors.primary alpha
                padding: '8px 5px',
              }}
            >
              <span style={{color: '#00F3FF', fontFamily: "'Orbitron', sans-serif"}}>[{notif.type || 'INFO'}]</span> {notif.message}
              <span style={{display: 'block', fontSize: '0.75em', color: '#CCCCCC', marginTop: '3px'}}>
                {new Date(notif.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No new messages in Comms Log.</p>
      )}
    </div>
  );
};
export default CommsLog;
