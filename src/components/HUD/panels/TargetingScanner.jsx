import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useRelevantQuests from '../../../hooks/useRelevantQuests';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useTheme } from '@mui/material/styles';
import {
  TargetingScannerContainer,
  TargetItem,
} from './TargetingScanner.styles';
import { HUDPanelHeader, HUDPanelTitle, HUDPanelList, HUDPanelButton } from '../HUDPanel.styles';

const TargetingScanner = ({ showHeader = true }) => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { relevantQuests, loading: questsLoading, error: questsError, refetchQuests } = useRelevantQuests(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const theme = useTheme();

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || questsLoading) {
    return <TargetingScannerContainer>Loading Targeting Scanner...</TargetingScannerContainer>;
  }
  if (profileError) {
    return <TargetingScannerContainer>Error loading profile: {profileError.message}</TargetingScannerContainer>;
  }
  if (questsError) {
    return <TargetingScannerContainer>Error loading quests: {questsError.message}</TargetingScannerContainer>;
  }
  if (!profile) {
    return <TargetingScannerContainer>User profile not available for targeting.</TargetingScannerContainer>;
  }

  return (
    <TargetingScannerContainer>
      {showHeader && (
        <HUDPanelHeader onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
          <HUDPanelTitle>Targeting Scanner (Relevant Quests)</HUDPanelTitle>
          <button onClick={toggleMinimize} aria-label={isMinimized ? "Expand Targeting Scanner" : "Minimize Targeting Scanner"}>
            {isMinimized ? '+' : '-'}
          </button>
        </HUDPanelHeader>
      )}
      {!isMinimized && (
        <div style={{ height: '100%', overflowY: 'auto' }}>
          {relevantQuests.length > 0 ? (
            <HUDPanelList>
              {relevantQuests.map(quest => {
                const isUrgent = quest.status && quest.status.toLowerCase().includes('urgent');
                return (
                  <TargetItem key={quest.id} style={{ animation: isUrgent ? 'pulseHighlight 1.5s infinite' : 'none' }}>
                    <div>
                      <span
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => window.open(`${import.meta.env.VITE_FRONTEND_URL}/visualizer/${quest.project_id}/${quest.id}`, '_blank')}
                        title={`View quest in visualizer`}
                      >
                        {quest.name}
                      </span>
                      <br/> Status: {quest.status}
                      <br />
                      Skill: {quest.skill_name ? `${quest.skill_name}, Lvl ${quest.requiredAffinityLevel}` : `ID ${quest.requiredAffinityId}, Lvl ${quest.requiredAffinityLevel}`}
                      <br />
                      Sensitivity: {quest.timeSensitivity}
                    </div>
                    <div>
                      {quest.assigned_user_ids?.includes(Number(profile.id)) ? (
                        <HUDPanelButton
                          style={{ backgroundColor: theme.palette.error.main, borderColor: theme.palette.error.main, color: theme.palette.getContrastText(theme.palette.error.main) }}
                          onClick={async () => {
                            try {
                              const token = await getAccessTokenSilently();
                              await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${quest.id}/drop`, { userId: profile.id }, { headers: { Authorization: `Bearer ${token}` } });
                              alert(`Quest "${quest.name}" dropped successfully!`);
                              refetchQuests();
                            } catch (error) {
                              console.error(`Error dropping quest:`, error);
                            }
                          }}
                        >
                          Drop
                        </HUDPanelButton>
                      ) : (
                        <HUDPanelButton
                          style={{ backgroundColor: theme.palette.success.main, borderColor: theme.palette.success.main, color: theme.palette.getContrastText(theme.palette.success.main) }}
                          onClick={async () => {
                            try {
                              const token = await getAccessTokenSilently();
                              const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/tasks/${quest.id}/accept`, { userId: profile.id }, { headers: { Authorization: `Bearer ${token}` } });
                              if (response.status === 200) {
                                alert(`Quest "${quest.name}" accepted successfully!`);
                                refetchQuests();
                              }
                            } catch (error) {
                              console.error(`Error accepting quest:`, error);
                            }
                          }}
                        >
                          Accept
                        </HUDPanelButton>
                      )}
                    </div>
                  </TargetItem>
                );
              })}
            </HUDPanelList>
          ) : (
            <p>No relevant quests found by scanner.</p>
          )}
        </div>
      )}
    </TargetingScannerContainer>
  );
};
export default TargetingScanner;
