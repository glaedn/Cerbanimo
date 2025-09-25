import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions.js';
import { useTheme } from '@mui/material/styles';
import {
  HUDPanelContainer,
  HUDPanelHeader,
  HUDPanelTitle,
  HUDPanelList,
  HUDPanelListItem,
} from '../HUDPanel.styles';

const accentGreen = '#00D787';

const CommandDeck = ({ showHeader = true }) => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { intentions, loading: intentionsLoading, error: intentionsError } = useUserIntentions(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const theme = useTheme();

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || intentionsLoading) {
    return <HUDPanelContainer>Loading Command Deck...</HUDPanelContainer>;
  }
  
  if (profileError) {
    console.error("Profile Error in CommandDeck:", profileError);
    return <HUDPanelContainer>Error loading profile data. Check console.</HUDPanelContainer>;
  }
  if (intentionsError) {
    console.error("Intentions Error in CommandDeck:", intentionsError);
    return <HUDPanelContainer>Error loading intentions data. Check console.</HUDPanelContainer>;
  }
  
  return (
    <HUDPanelContainer>
      {showHeader && (
        <HUDPanelHeader onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
          <HUDPanelTitle>Command Deck (Managed Intentions)</HUDPanelTitle>
          <button onClick={toggleMinimize} aria-label={isMinimized ? "Expand Command Deck" : "Minimize Command Deck"}>
            {isMinimized ? '+' : '-'}
          </button>
        </HUDPanelHeader>
      )}
      {!isMinimized && (
        <div style={{ height: '100%', overflowY: 'auto' }}>
           {intentions.length > 0 ? (
            <HUDPanelList>
              {intentions.map(intention => (
                <HUDPanelListItem key={intention.id}>
                  <div>
                    <a href={`/visualizer/${intention.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{intention.name}</a>
                    <br />
                    <span>
                      Quests: {intention.questCount} | Active: {intention.activeQuests} | Completed: {intention.completedQuests} <br/> credits: {intention.token_pool - (intention.used_tokens || 0) - (intention.reserved_tokens || 0)}
                    </span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '4px', marginTop: '8px' }}>
                    <div
                      style={{ width: `${intention.progress}%`, backgroundColor: theme.palette.success.main, height: '18px', lineHeight: '18px', textAlign: 'center', borderRadius: '4px' }}
                    >
                      {intention.progress}%
                    </div>
                  </div>
                  {intention.errorFetchingQuests && <span> (Error loading quests)</span>}
                </HUDPanelListItem>
              ))}
            </HUDPanelList>
          ) : (
            <p>No intentions currently managed.</p>
          )}
        </div>
      )}
    </HUDPanelContainer>
  );
};

export default CommandDeck;
