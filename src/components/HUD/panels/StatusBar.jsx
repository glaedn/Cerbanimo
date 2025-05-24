import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import { useNotifications } from '../../../hooks/useNotifications'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import './StatusBar.css'; // Specific styles for StatusBar

const StatusBar = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { unreadCount, loading: notificationsLoading, error: notificationsError } = useNotifications(profile?.id);

  const accentOrange = '#FF9F40'; // theme.colors.accentOrange
  const primaryColor = '#00F3FF'; // theme.colors.primary
  const accentFont = "'Orbitron', sans-serif"; // theme.typography.fontFamilyAccent

  if (profileLoading) return <div className="hud-panel status-bar">Loading Status...</div>;
  if (profileError) return <div className="hud-panel status-bar">Error loading profile: {profileError.message}</div>;
  if (!profile) return <div className="hud-panel status-bar">User data unavailable.</div>;
  
  // Simplified XP percentage for visualization. 
  // Assumes current_level_xp and xp_for_next_level are part of profile.experience
  let xpPercentage = 0;
  if (profile.experience && profile.experience.xp_for_next_level > 0) {
    xpPercentage = (profile.experience.current_level_xp / profile.experience.xp_for_next_level) * 100;
  } else if (profile.experience) { // Fallback if only total_xp is available
    xpPercentage = (profile.experience.total_xp % 1000) / 10; // Max 1000 XP per level for this fallback
  }
  xpPercentage = Math.min(Math.max(xpPercentage, 0), 100); // Cap between 0-100

  return (
    <div className="hud-panel status-bar">
      <div className="status-item user-info">
        <span className="username" style={{ fontFamily: accentFont }}>{profile.username}</span>
        <span className="level">Lvl: {profile.experience?.current_level}</span>
      </div>

      <div className="status-item xp-bar-container">
        <div className="progress-bar-container" style={{ height: '12px', width: '150px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="progress-bar shimmer" // Added shimmer class
            style={{ 
              width: `${xpPercentage}%`, 
              backgroundColor: primaryColor, 
              height: '12px',
              lineHeight: '12px',
              fontSize: '9px'
            }}
          >
            {Math.round(xpPercentage)}%
          </div>
        </div>
      </div>

      <div className="status-item tokens-info">
        <span style={{ fontFamily: accentFont }}>Tokens:</span> {profile.tokens}
      </div>
      
      <div className="status-item notifications-info">
        <span 
          className="notification-icon" 
          style={{ 
            fontFamily: accentFont,
            color: unreadCount > 0 ? accentOrange : primaryColor,
            textShadow: unreadCount > 0 ? `0 0 8px ${accentOrange}` : 'none'
          }}
        >
          [N]
        </span>
        <span className="notification-count">
          {notificationsLoading ? '...' : (notificationsError ? '!' : unreadCount)}
        </span>
      </div>
    </div>
  );
};
export default StatusBar;
