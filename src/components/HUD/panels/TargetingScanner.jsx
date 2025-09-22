import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useRelevantQuests from '../../../hooks/useRelevantQuests'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react'; // Adjust path if needed
import theme from '../../../../styles/theme';
// import './TargetingScanner.css'; // Optional: For specific TargetingScanner styles

const TargetingScanner = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { relevantQuests, loading: questsLoading, error: questsError, refetchQuests } = useRelevantQuests(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const { logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || questsLoading) {
    return <div className="hud-panel targeting-scanner">Loading Targeting Scanner...</div>;
  }
  if (profileError) {
    return <div className="hud-panel targeting-scanner">Error loading profile: {profileError.message}</div>;
  }
  if (questsError) {
    return <div className="hud-panel targeting-scanner">{`Error loading ${theme.terminology.task_plural}: ${questsError.message}`}</div>;
  }
  if (!profile) {
    return <div className="hud-panel targeting-scanner">User profile not available for targeting.</div>;
  }

  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className={`hud-panel targeting-scanner ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>{`Targeting Scanner (Relevant ${theme.terminology.task_plural})`}</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Targeting Scanner" : "Minimize Targeting Scanner"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {relevantQuests.length > 0 ? (
            <ul>
              {relevantQuests.map(quest => {
                const isUrgent = quest.status && quest.status.toLowerCase().includes('urgent');
                return (
                  <li 
                  key={quest.id}
                  className={`quest-item ${isUrgent ? 'urgent-quest' : ''}`}
                  >
                  <div className="quest-info">
                    <span
                    className="quest-name"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => window.open(`${import.meta.env.VITE_FRONTEND_URL}/visualizer/${quest.project_id}/${quest.id}`, '_blank')}
                    title={`View ${theme.terminology.task} in visualizer`}
                    >
                    {quest.name}
                    </span>
                    <br/> Status: {quest.status}
                    <br />
                    {theme.terminology.skill}: {quest.skill_name ? `${quest.skill_name}, Lvl ${quest.requiredAffinityLevel}` : `ID ${quest.requiredAffinityId}, Lvl ${quest.requiredAffinityLevel}`}
                    <br />
                    Sensitivity: {quest.timeSensitivity}
                  </div>
                  <div className="quest-actions">
                    {quest.assigned_user_ids?.includes(Number(profile.id)) ? (
                    <button 
                      style={{ backgroundColor: '#ff4444', borderColor: '#ff4444', color: '#0A0A2E' }}
                      onClick={async () => {
                      try {
                        const token = await getAccessTokenSilently();
                        await axios.put(
                        `${import.meta.env.VITE_BACKEND_URL}/tasks/${quest.id}/drop`,
                        { userId: profile.id },
                        {
                          headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                          }
                        }
                        );
                        alert(`${theme.terminology.task} "${quest.name}" dropped successfully!`);
                        refetchQuests(); // Refetch quests after dropping
                      } catch (error) {
                        console.error(`Error dropping ${theme.terminology.task}:`, error);
                        // Handle error appropriately
                      }
                      }}
                    >
                      Drop
                    </button>
                    ) : (
                    <button 
                      style={{ backgroundColor: accentGreen, borderColor: accentGreen, color: '#0A0A2E' }}
                      onClick={async () => {
                      try {
                        const token = await getAccessTokenSilently();
                        const response = await axios.put(
                        `${import.meta.env.VITE_BACKEND_URL}/tasks/${quest.id}/accept`,
                        { userId: profile.id },
                        {
                          headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                          }
                        }
                        );
                        if (response.status === 200) {
                        alert(`${theme.terminology.task} "${quest.name}" accepted successfully!`);
                        refetchQuests(); // Refetch quests after accepting
                        }
                      } catch (error) {
                        console.error(`Error accepting ${theme.terminology.task}:`, error);
                        // Handle error appropriately
                      }
                      }}
                    >
                      Accept
                    </button>
                    )}
                  </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>{`No relevant ${theme.terminology.task_plural} found by scanner.`}</p>
          )}
        </div>
      )}
    </div>
  );
};
export default TargetingScanner;
