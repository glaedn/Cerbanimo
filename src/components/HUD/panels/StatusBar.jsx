import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
// Removed useNotifications hook
import '../HUDPanel.css'; // Shared panel styles
import './StatusBar.css'; // Specific styles for StatusBar

const StatusBar = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();

  const primaryColor = '#00F3FF'; // theme.colors.primary
  const accentFont = "'Orbitron', sans-serif"; // theme.typography.fontFamilyAccent

  if (profileLoading) return <div className="hud-panel status-bar">Loading Status...</div>;
  if (profileError) return <div className="hud-panel status-bar">Error loading profile: {profileError.message}</div>;
  if (!profile || !profile.skills) return <div className="hud-panel status-bar">User data or skills unavailable.</div>;
  
  // Calculate Total Global Experience from profile.skills
  // Assuming each skill in profile.skills has an 'experience' property
  const totalGlobalExp = profile.skills.reduce((sum, skill) => sum + (skill.experience || 0), 0);

  const currentLevel = Math.floor(Math.sqrt(totalGlobalExp / 40)) + 1;

  const expForCurrentLevel = 40 * Math.pow(currentLevel - 1, 2);
  const expForNextLevel = 40 * Math.pow(currentLevel, 2);

  const currentLevelExpProgress = totalGlobalExp - expForCurrentLevel;
  const totalExpNeededForNextLevelSpan = expForNextLevel - expForCurrentLevel;

  let xpPercentage = 0;
  if (totalExpNeededForNextLevelSpan > 0) {
      xpPercentage = (currentLevelExpProgress / totalExpNeededForNextLevelSpan) * 100;
  } else if (currentLevelExpProgress >= 0) { 
      // Handles cases where user might be at max level or exactly at a level threshold
      // or if totalExpNeededForNextLevelSpan is somehow zero (e.g. currentLevel = 0 from bad data)
      xpPercentage = currentLevel === 1 && totalGlobalExp === 0 ? 0 : 100;
  }
  xpPercentage = Math.min(Math.max(xpPercentage, 0), 100); // Cap between 0-100

  return (
    <div className="hud-panel status-bar">
      <div className="status-item user-info">
        <span className="username" style={{ fontFamily: accentFont }}>{profile.username}</span>
        <span className="level">Lvl: {currentLevel}</span>
      </div>

      <div className="status-item xp-bar-container">
        <div className="progress-bar-container" style={{ height: '12px', width: '200px', backgroundColor: 'rgba(0,0,0,0.5)' }}> {/* Increased width for more text */}
          <div 
            className="progress-bar shimmer"
            style={{ 
              width: `${xpPercentage}%`, 
              backgroundColor: primaryColor, 
              height: '12px',
              lineHeight: '12px',
              fontSize: '9px',
              overflow: 'hidden' // Ensure text doesn't overflow the bar itself
            }}
            title={`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          >
            {/* Display XP progress text */}
            {`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          </div>
        </div>
      </div>

      <div className="status-item tokens-info">
        <span style={{ fontFamily: accentFont }}>Galactic Credits:</span> {profile.tokens !== undefined ? profile.tokens : 'N/A'}
      </div>
      
      {/* Notifications section removed */}
    </div>
  );
};
export default StatusBar;
