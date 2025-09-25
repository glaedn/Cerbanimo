import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useAssignedQuests from '../../../hooks/useAssignedQuests';
import { useTheme } from '@mui/material/styles';
import {
  MissionConsoleContainer,
  QuestItem,
  QuestTitle,
  QuestDetails,
  QuestActions,
  ActionButton,
} from './MissionConsole.styles';
import { HUDPanelHeader, HUDPanelTitle, HUDPanelList } from '../HUDPanel.styles';

const MissionConsole = ({ showHeader = true }) => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { assignedQuests, loading: questsLoading, error: questsError, refetchQuests } = useAssignedQuests(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const theme = useTheme();

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || questsLoading) {
    return <MissionConsoleContainer>Loading Quest Console...</MissionConsoleContainer>;
  }
  if (profileError) {
    return <MissionConsoleContainer>Error loading profile: {profileError.message}</MissionConsoleContainer>;
  }
  if (questsError) {
    return <MissionConsoleContainer>Error loading quests: {questsError.message}</MissionConsoleContainer>;
  }
  if (!profile) {
    return <MissionConsoleContainer>User profile not available.</MissionConsoleContainer>;
  }

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes('active')) return theme.palette.success.main;
    if (s.includes('inactive')) return theme.palette.info.main;
    if (s.includes('submitted')) return theme.palette.warning.main;
    if (s.includes('completed')) return theme.palette.secondary.main;
    return theme.palette.text.secondary;
  };

  const handleViewQuest = (quest) => {
    navigate(`/visualizer/${quest.projectId}/${quest.id}`);
  };

  const handleDropQuest = async (questId) => {
    if (!profile || !profile.id) {
      alert(`User profile not found. Cannot drop quest.`);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${questId}/drop`,
        { userId: profile.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Quest dropped successfully.`);
      refetchQuests();
    } catch (error) {
      console.error(`Error dropping quest:`, error.response?.data || error.message);
      alert(`Failed to drop quest: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <MissionConsoleContainer>
      {showHeader && (
        <HUDPanelHeader onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
          <HUDPanelTitle>Quest Console (Assigned Quests)</HUDPanelTitle>
          <button onClick={toggleMinimize} aria-label={isMinimized ? `Expand Quest Console` : `Minimize Quest Console`}>
            {isMinimized ? '+' : '-'}
          </button>
        </HUDPanelHeader>
      )}
      {!isMinimized && (
        <div style={{ height: '100%', overflowY: 'auto' }}>
          {assignedQuests.length > 0 ? (
            <HUDPanelList>
              {assignedQuests.map(quest => (
                <QuestItem key={quest.id}>
                  <div>
                    <QuestTitle>{quest.name}</QuestTitle> ({quest.projectName})
                    <br />
                    <QuestDetails>
                      Status: <span style={{ color: getStatusColor(quest.status), fontWeight: 'bold' }}>{quest.status}</span>
                      {quest.timeRemaining !== 'N/A' && <span> - Time Left: {quest.timeRemaining}</span>}
                    </QuestDetails>
                  </div>
                  <QuestActions>
                    <ActionButton onClick={() => handleViewQuest(quest)}>View</ActionButton>
                    {!(quest.status.toLowerCase().includes('submitted') || quest.status.toLowerCase().includes('completed')) && (
                      <ActionButton onClick={() => handleDropQuest(quest.id)}>Drop</ActionButton>
                    )}
                  </QuestActions>
                </QuestItem>
              ))}
            </HUDPanelList>
          ) : (
            <p>No quests currently assigned.</p>
          )}
        </div>
      )}
    </MissionConsoleContainer>
  );
};
export default MissionConsole;
