import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useSkillData from '../../../hooks/useSkillData';
import { useAuth0 } from '@auth0/auth0-react';
import { useCrisis } from '../../../context/CrisisContext';
import { useLoFi } from '../../../context/LoFiContext';
import { Switch, FormControlLabel } from '@mui/material';
import '../HUDPanel.css';
import './StatusBar.css';


const StatusBar = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { allSkills, loading: skillsLoading, error: skillsError } = useSkillData();
  const { user, isAuthenticated } = useAuth0();
  const { isCrisisMode, toggleCrisisMode } = useCrisis();
  const { isLoFiMode, toggleLoFiMode } = useLoFi();

  const primaryColor = '#00F3FF';
  const accentFont = "'Orbitron', sans-serif";

  const renderLoFiToggle = () => (
    <div className="status-item lofi-toggle">
      <FormControlLabel
        control={
          <Switch
            checked={isLoFiMode}
            onChange={toggleLoFiMode}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#00F3FF' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#00F3FF' }
            }}
          />
        }
        label={<span style={{ fontFamily: accentFont, fontSize: '10px', color: isLoFiMode ? '#00F3FF' : '#CCC' }}>LO_FI</span>}
      />
    </div>
  );

  if (profileLoading || skillsLoading) {
    return (
      <div className="hud-panel status-bar">
        <div className="status-item">Loading Status...</div>
        {renderLoFiToggle()}
      </div>
    );
  }

  if (profileError || skillsError) {
    return (
      <div className="hud-panel status-bar">
        <div className="status-item">Error: {profileError?.message || skillsError?.message}</div>
        {renderLoFiToggle()}
      </div>
    );
  }

  if (!profile || !allSkills || !isAuthenticated || !user) {
    return (
      <div className="hud-panel status-bar">
        {renderLoFiToggle()}
      </div>
    );
  }
  
  // Calculate Total Global Experience from allSkills
  let totalGlobalExp = 0;
  if (allSkills && profile && profile.id) {
    allSkills.forEach(skill => {
      if (skill.unlocked_users && Array.isArray(skill.unlocked_users)) {
        skill.unlocked_users.forEach(userEntry => {
          if (userEntry && typeof profile.id !== 'undefined') {
            const entryUserId = parseInt(userEntry.user_id, 10);
            const currentProfileId = parseInt(profile.id, 10);

            if (entryUserId === currentProfileId) {
              const experienceValue = userEntry.experience !== undefined ? userEntry.experience : userEntry.exp;
              if (typeof experienceValue === 'number') {
                totalGlobalExp += experienceValue;
              }
            }
          }
        });
      }
    });
  }

  const currentLevel = Math.floor(Math.sqrt(totalGlobalExp / 40)) + 1;

  const expForCurrentLevel = 40 * Math.pow(currentLevel - 1, 2);
  const expForNextLevel = 40 * Math.pow(currentLevel, 2);

  const currentLevelExpProgress = totalGlobalExp - expForCurrentLevel;
  const totalExpNeededForNextLevelSpan = expForNextLevel - expForCurrentLevel;

  let xpPercentage = 0;
  if (totalExpNeededForNextLevelSpan > 0) {
      xpPercentage = (currentLevelExpProgress / totalExpNeededForNextLevelSpan) * 100;
  } else if (currentLevelExpProgress >= 0) { 
      xpPercentage = currentLevel === 1 && totalGlobalExp === 0 ? 0 : 100;
  }
  xpPercentage = Math.min(Math.max(xpPercentage, 0), 100);

  return (
    <div className="hud-panel status-bar">
      <div className="status-item user-info">
        <span className="username" style={{ fontFamily: accentFont }}>{profile.username}</span>
        <span className="level">Lvl: {currentLevel}</span>
      </div>

      <div className="status-item xp-bar-container">
        <div className="progress-bar-container" style={{ height: '12px', width: '200px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="progress-bar shimmer"
            style={{ 
              width: `${xpPercentage}%`, 
              backgroundColor: primaryColor, 
              height: '12px',
              lineHeight: '12px',
              fontSize: '9px',
              overflow: 'hidden'
            }}
            title={`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          >
            {`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          </div>
        </div>
      </div>

      <div className="status-item tokens-info">
        <span style={{ fontFamily: accentFont }}>Galactic Credits:</span> {profile.tokens !== undefined ? profile.tokens : 'N/A'}
      </div>

      <div className="status-item crisis-toggle">
        <FormControlLabel
          control={
            <Switch
              checked={isCrisisMode}
              onChange={toggleCrisisMode}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF4136' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF4136' }
              }}
            />
          }
          label={<span style={{ fontFamily: accentFont, fontSize: '10px', color: isCrisisMode ? '#FF4136' : '#CCC' }}>CRISIS_MODE</span>}
        />
      </div>

      {renderLoFiToggle()}
    </div>
  );
};
export default StatusBar;
