import React, { useState } from 'react'; // Correctly import useState
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects.js'; // This still needed to sum tokens from projects
import '../HUDPanel.css'; // Shared panel styles
// import './CommandDeck.css'; // Optional: For specific CommandDeck styles if needed

// Mock data if not available from hooks - REMOVE IF REAL DATA IS PRESENT
const MOCKED_TOKEN_POOL = 10000; // Example global pool
const MOCK_PROJECT_TOKENS = true; // Set to false if projects have real token data

const CommandDeck = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false); // Use useState

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || projectsLoading) {
    return <div className="hud-panel command-deck">Loading Galactic Treasury...</div>;
  }
  
  // Simplified error display
  if (profileError) {
    console.error("Profile Error in CommandDeck:", profileError);
    return <div className="hud-panel command-deck">Error loading profile data. Check console.</div>;
  }
  if (projectsError) {
    console.error("Projects Error in CommandDeck:", projectsError);
    return <div className="hud-panel command-deck">Error loading project data. Check console.</div>;
  }
  
  // Determine token pool
  const tokenPool = profile?.token_pool ?? MOCKED_TOKEN_POOL;
  let usingMockedTokenPool = !profile?.token_pool;

  // Calculate total used or reserved tokens from projects
  let totalUsedOrReservedTokens = 0;
  let usingMockedProjectTokens = false;

  if (projects && projects.length > 0) {
    totalUsedOrReservedTokens = projects.reduce((sum, project) => {
      let usedTokens = project.used_tokens;
      let reservedTokens = project.reserved_tokens;

      if (MOCK_PROJECT_TOKENS || usedTokens === undefined || reservedTokens === undefined) {
        usedTokens = project.used_tokens ?? Math.floor(Math.random() * 100); // Example: 0-99
        reservedTokens = project.reserved_tokens ?? Math.floor(Math.random() * 50); // Example: 0-49
        if (project.used_tokens === undefined || project.reserved_tokens === undefined) {
            usingMockedProjectTokens = true; // Flag that at least one project used mocked values
        }
      }
      return sum + (usedTokens || 0) + (reservedTokens || 0);
    }, 0);
  }

  const availableCredits = tokenPool - totalUsedOrReservedTokens;

  // Log if mock data was used (optional, for development feedback)
  if (usingMockedTokenPool) {
    console.warn("CommandDeck: Using MOCKED_TOKEN_POOL as profile.token_pool was not available.");
  }
  if (usingMockedProjectTokens) {
    console.warn("CommandDeck: Using mocked used_tokens or reserved_tokens for one or more projects as they were not available.");
  }

  return (
    <div className={`hud-panel command-deck ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Galactic Treasury</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Galactic Treasury" : "Minimize Galactic Treasury"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          <div className="credits-display" style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '1.1em', color: '#00F3FF', marginBottom: '10px', fontFamily: "'Orbitron', sans-serif" }}>
              Available Galactic Credits:
            </p>
            <h2 style={{ fontSize: '2.5em', color: '#FFFFFF', margin: '0', textShadow: '0 0 10px #00F3FF' }}>
              {availableCredits.toLocaleString()} GC
            </h2>
            {(usingMockedTokenPool || usingMockedProjectTokens) && (
              <p style={{fontSize: '0.7em', color: '#FF9F40', marginTop: '10px'}}>
                (Note: Display includes estimated values)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandDeck;
