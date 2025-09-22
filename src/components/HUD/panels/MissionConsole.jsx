import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useAssignedQuests from '../../../hooks/useAssignedQuests'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import './MissionConsole.css'; // Optional: For specific MissionConsole styles
import theme from '../../../../styles/theme';

const MissionConsole = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { assignedQuests, loading: questsLoading, error: questsError, refetchQuests } = useAssignedQuests(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || questsLoading) {
    return <div className="hud-panel mission-console">{`Loading ${theme.terminology.task} Console...`}</div>;
  }
  if (profileError) {
    return <div className="hud-panel mission-console">Error loading profile: {profileError.message}</div>;
  }
  if (questsError) {
    return <div className="hud-panel mission-console">{`Error loading ${theme.terminology.task_plural}: ${questsError.message}`}</div>;
  }
  if (!profile) {
    return <div className="hud-panel mission-console">User profile not available.</div>;
  }

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes('active')) return '#32CD32'; // Green
    if (s.includes('inactive')) return '#87CEFA'; // Blue
    if (s.includes('submitted')) return '#FFA500'; // Orange
    if (s.includes('completed')) return '#FF69B4'; // Pink
    return '#CCCCCC'; // Default/Other
  };

  const handleViewQuest = (quest) => {
    navigate(`/visualizer/${quest.projectId}/${quest.id}`);
  };

  const handleDropQuest = async (questId) => {
    if (!profile || !profile.id) {
      alert(`User profile not found. Cannot drop ${theme.terminology.task}.`);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${questId}/drop`,
        { userId: profile.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`${theme.terminology.task} dropped successfully.`);
      refetchQuests(); // Refresh the quest list
    } catch (error) {
      console.error(`Error dropping ${theme.terminology.task}:`, error.response?.data || error.message);
      alert(`Failed to drop ${theme.terminology.task}: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className={`hud-panel mission-console ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>{`${theme.terminology.task} Console (Assigned ${theme.terminology.task_plural})`}</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? `Expand ${theme.terminology.task} Console` : `Minimize ${theme.terminology.task} Console`}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {assignedQuests.length > 0 ? (
            <ul>
              {assignedQuests.map(quest => (
                <li key={quest.id} className="task-item">
                  <div className="task-info">
                    <span className="task-name">{quest.name}</span> <br/> ({quest.projectName})
                    <br />
                    Status: <span style={{ color: getStatusColor(quest.status), fontWeight: 'bold' }}>{quest.status}</span>
                    {quest.timeRemaining !== 'N/A' && <span> - Time Left: {quest.timeRemaining}</span>}
                  </div>
                  <div className="task-actions">
                    <button onClick={() => handleViewQuest(quest)}>View</button>
                    {!(quest.status.toLowerCase().includes('submitted') || quest.status.toLowerCase().includes('completed')) && (
                      <button onClick={() => handleDropQuest(quest.id)}>Drop</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>{`No ${theme.terminology.task_plural} currently assigned.`}</p>
          )}
        </div>
      )}
    </div>
  );
};
export default MissionConsole;
