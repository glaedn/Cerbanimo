import React, { useState } from 'react'; // Correctly import useState
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects.js'; // This still needed to sum tokens from projects
import '../HUDPanel.css'; // Shared panel styles
// import './CommandDeck.css'; // Optional: For specific CommandDeck styles if needed

// Mock data if not available from hooks - REMOVE IF REAL DATA IS PRESENT
const MOCKED_TOKEN_POOL = 10000; // Example global pool
const MOCK_PROJECT_TOKENS = true; // Set to false if projects have real token data
const accentGreen = '#00D787'; // theme.colors.accentGreen

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
  
  return (
    <div className={`hud-panel command-deck ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Command Deck (Managed Projects)</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Galactic Treasury" : "Minimize Galactic Treasury"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
           {projects.length > 0 ? (

        <ul>

          {projects.map(p => (

            <li key={p.id} className="project-item">

              <div className="project-info">

                <span className="project-name">{p.name}</span>
                <br />
                <span className="project-details">

                  Tasks: {p.taskCount} | Active: {p.activeTasks} | Completed: {p.completedTasks} <br/> Credits: {p.token_pool - (p.used_tokens || 0) - (p.reserved_tokens || 0)}

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

              {p.errorFetchingTasks && <span className="error-text"> (Error loading project tasks)</span>}

            </li>

          ))}

        </ul>

      ) : (

        <p>No projects currently managed.</p>
      )}
        </div>
      )}
    </div>
  );
};

export default CommandDeck;
