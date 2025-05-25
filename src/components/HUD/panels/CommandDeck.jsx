import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useUserProjects from '../../../hooks/useUserProjects.js';
import '../HUDPanel.css'; // Shared panel styles
// import './CommandDeck.css'; // Optional: For specific CommandDeck styles if needed

const CommandDeck = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects(profile?.id);

  if (profileLoading || projectsLoading) return <div className="hud-panel command-deck">Loading Command Deck...</div>;
  if (profileError) return <div className="hud-panel command-deck">Error loading profile: {profileError.message}</div>;
  if (projectsError) return <div className="hud-panel command-deck">Error loading projects: {projectsError.message}</div>;
  if (!profile) return <div className="hud-panel command-deck">User profile not available.</div>;

  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className="hud-panel command-deck">
      <div className="hud-panel-header">
        <h4>Command Deck (Managed Projects)</h4>
      </div>
      {projects.length > 0 ? (
        <ul>
          {projects.map(p => (
            <li key={p.id} className="project-item">
              <div className="project-info">
                <span className="project-name">{p.name}</span>
                <span className="project-details">
                  Tasks: {p.taskCount} | Active: {p.activeTasks} | Completed: {p.completedTasks} | XP: {p.xpGained}
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
  );
};
export default CommandDeck;
