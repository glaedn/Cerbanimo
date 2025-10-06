import React, { useState } from 'react'; // Correctly import useState
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions.js'; // This still needed to sum tokens from intentions
import '../HUDPanel.css'; // Shared panel styles
// import './CommandDeck.css'; // Optional: For specific CommandDeck styles if needed

// Mock data if not available from hooks - REMOVE IF REAL DATA IS PRESENT
const MOCKED_TOKEN_POOL = 10000; // Example global pool
const MOCK_INTENTION_TOKENS = true; // Set to false if intentions have real token data
const accentGreen = '#00D787'; // theme.colors.accentGreen

const CommandDeck = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { intentions, loading: intentionsLoading, error: intentionsError } = useUserIntentions(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false); // Use useState

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || intentionsLoading) {
    return <div className="hud-panel command-deck">Loading Commmand Deck...</div>;
  }
  
  // Simplified error display
  if (profileError) {
    console.error("Profile Error in CommandDeck:", profileError);
    return <div className="hud-panel command-deck">Error loading profile data. Check console.</div>;
  }
  if (intentionsError) {
    console.error("Intentions Error in CommandDeck:", intentionsError);
    return <div className="hud-panel command-deck">Error loading intention data. Check console.</div>;
  }
  
  return (
    <div className={`hud-panel command-deck ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Command Deck (Managed Intentions)</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Galactic Treasury" : "Minimize Galactic Treasury"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
           {intentions.length > 0 ? (

        <ul>

          {intentions.map(p => (

            <li key={p.id} className="intention-item">

              <div className="intention-info">

                <a className="intention-name" href={`/lotus-map/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{p.name}</a>
                <br />
                <span className="intention-details">

                  Tasks: {p.taskCount} | Active: {p.activeTasks} | Completed: {p.completedTasks} <br/> credits: {p.token_pool - (p.used_tokens || 0) - (p.reserved_tokens || 0)}

                </span>

              </div>

              <div className="progress-bar-container">

                <div 

                  className="progress-bar" 

                  style={{ width: `${p.progress}%`, backgroundColor: accentGreen }}

                >

                  {p.progress}%

                </div>

              </div>

              {p.errorFetchingTasks && <span className="error-text"> (Error loading intention tasks)</span>}

            </li>

          ))}

        </ul>

      ) : (

        <p>No intentions currently managed.</p>
      )}
        </div>
      )}
    </div>
  );
};

export default CommandDeck;
