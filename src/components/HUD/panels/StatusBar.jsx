import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useAffinityData from '../../../hooks/useAffinityData';
import { useAuth0 } from '@auth0/auth0-react';
import { useTheme } from '@mui/material/styles';
import {
  StatusBarContainer,
  StatusItem,
  Username,
  Level,
  TokensInfo,
} from './StatusBar.styles';


const StatusBar = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { allAffinities, loading: affinitiesLoading, error: affinitiesError } = useAffinityData();
  const { user, isAuthenticated } = useAuth0();
  const theme = useTheme();

  if (profileLoading || affinitiesLoading) return <StatusBarContainer>Loading Status...</StatusBarContainer>;
  if (profileError || affinitiesError) return <StatusBarContainer>Error: {profileError?.message || affinitiesError?.message}</StatusBarContainer>;
  if (!profile || !allAffinities || !isAuthenticated || !user) return <StatusBarContainer>User data, affinities, or authentication unavailable.</StatusBarContainer>;
  
  let totalGlobalExp = 0;
  if (allAffinities && profile && profile.id) {
    allAffinities.forEach(affinity => {
      if (affinity.unlocked_users && Array.isArray(affinity.unlocked_users)) {
        affinity.unlocked_users.forEach(userEntry => {
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
    <StatusBarContainer>
      <StatusItem>
        <Username>{profile.username}</Username>
        <Level>Lvl: {currentLevel}</Level>
      </StatusItem>

      <StatusItem>
        <div style={{ height: '12px', width: '200px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div 
            style={{ 
              width: `${xpPercentage}%`, 
              backgroundColor: theme.palette.primary.main,
              height: '12px',
              lineHeight: '12px',
              fontSize: '9px',
              overflow: 'hidden',
              textAlign: 'center',
              color: theme.palette.getContrastText(theme.palette.primary.main)
            }}
            title={`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          >
            {`${Math.round(currentLevelExpProgress)} / ${Math.round(totalExpNeededForNextLevelSpan)} XP`}
          </div>
        </div>
      </StatusItem>

      <TokensInfo>
        <span style={{ fontFamily: theme.typography.fontFamilyAccent }}>Stardust:</span> {profile.tokens !== undefined ? profile.tokens : 'N/A'}
      </TokensInfo>
    </StatusBarContainer>
  );
};
export default StatusBar;
