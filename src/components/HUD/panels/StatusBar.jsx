import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
// Removed useNotifications hook
import useCapabilityData from '../../../hooks/useCapabilityData';
import { useAuth0 } from '@auth0/auth0-react';
import '../HUDPanel.css'; // Shared panel styles
import './StatusBar.css'; // Specific styles for StatusBar


const StatusBar = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { allCapabilities, loading: capabilitiesLoading, error: capabilitiesError } = useCapabilityData();
  const { user, isAuthenticated } = useAuth0();

  const primaryColor = '#00F3FF'; // theme.colors.primary
  const accentFont = "'Orbitron', sans-serif"; // theme.typography.fontFamilyAccent

  if (profileLoading || capabilitiesLoading) return <div className="hud-panel status-bar">Loading Status...</div>;
  if (profileError || capabilitiesError) return <div className="hud-panel status-bar">Error: {profileError?.message || capabilitiesError?.message}</div>;
  if (!profile || !allCapabilities || !isAuthenticated || !user) return <div className="hud-panel status-bar">User data, capabilities, or authentication unavailable.</div>;
  
  console.log('[StatusBar Debug] allCapabilities:', allCapabilities);
  console.log('[StatusBar Debug] profile.id:', profile ? profile.id : 'Profile or profile.id not available');
  // Calculate Total Global Experience from allCapabilities
  let totalGlobalExp = 0;
  if (allCapabilities && profile && profile.id) { // Ensure data is available
    allCapabilities.forEach(capability => {
      console.log('[StatusBar Debug] Processing capability:', capability.name, capability.unlocked_users);
      if (capability.unlocked_users && Array.isArray(capability.unlocked_users)) {
        capability.unlocked_users.forEach(userEntry => { // userEntry is now an object
          console.log('[StatusBar Debug] Checking userEntry:', userEntry);
          if (userEntry && typeof profile.id !== 'undefined') { // Ensure profile.id is available
            const entryUserId = parseInt(userEntry.user_id, 10);
            const currentProfileId = parseInt(profile.id, 10);

            console.log(`[StatusBar Debug] Comparing IDs: entryUserId=${entryUserId} (type: ${typeof entryUserId}), currentProfileId=${currentProfileId} (type: ${typeof currentProfileId})`);

            if (entryUserId === currentProfileId) {
              const experienceValue = userEntry.experience !== undefined ? userEntry.experience : userEntry.exp;
              console.log('[StatusBar Debug] Matched user.id:', currentProfileId, 'Found experienceValue:', experienceValue, 'from userEntry:', userEntry);
              if (typeof experienceValue === 'number') {
                totalGlobalExp += experienceValue;
              }
            }
          }
        });
      }
    });
  }

  console.log('[StatusBar Debug] Final totalGlobalExp:', totalGlobalExp);
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
