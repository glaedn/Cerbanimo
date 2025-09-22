import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserIntentions from '../../../hooks/useUserIntentions.js';
import '../HUDPanel.css';
import theme from '../../../styles/theme.js';

const accentGreen = '#00D787';

const CommandDeck = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { intentions, loading: intentionsLoading, error: intentionsError } = useUserIntentions(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || intentionsLoading) {
    return <div className="hud-panel command-deck">Loading Command Deck...</div>;
  }
  
  if (profileError) {
    console.error("Profile Error in CommandDeck:", profileError);
    return <div className="hud-panel command-deck">Error loading profile data. Check console.</div>;
  }
  if (intentionsError) {
    console.error("Intentions Error in CommandDeck:", intentionsError);
    return <div className="hud-panel command-deck">Error loading {theme.terminology.project_plural} data. Check console.</div>;
  }
  
  return (
    <div className={`hud-panel command-deck ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Command Deck (Managed {theme.terminology.project_plural})</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Command Deck" : "Minimize Command Deck"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
           {intentions.length > 0 ? (

        <ul>

          {intentions.map(intention => (

            <li key={intention.id} className="intention-item">

              <div className="intention-info">

                <a className="intention-name" href={`/visualizer/${intention.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{intention.name}</a>
                <br />
                <span className="intention-details">

                  {theme.terminology.task_plural}: {intention.questCount} | Active: {intention.activeQuests} | Completed: {intention.completedQuests} <br/> credits: {intention.token_pool - (intention.used_tokens || 0) - (intention.reserved_tokens || 0)}

                </span>

              </div>

              <div className="progress-bar-container">

                <div 

                  className="progress-bar" 

                  style={{ width: `${intention.progress}%`, backgroundColor: accentGreen }}

                >

                  {intention.progress}%

                </div>

              </div>

              {intention.errorFetchingQuests && <span className="error-text"> (Error loading {theme.terminology.task_plural})</span>}

            </li>

          ))}

        </ul>

      ) : (

        <p>No {theme.terminology.project_plural} currently managed.</p>
      )}
        </div>
      )}
    </div>
  );
};

export default CommandDeck;
