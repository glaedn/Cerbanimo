import React, { useState, useEffect } from 'react'; // Correctly import useState
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects.js'; // This still needed to sum tokens from projects
import ChronicleTimeline from '../../ChronicleTimeline';
import { useAppStore } from '../../../store/useAppStore';
import '../HUDPanel.css'; // Shared panel styles
// import './CommandDeck.css'; // Optional: For specific CommandDeck styles if needed

const accentGreen = '#00D787'; // theme.colors.accentGreen

const CommandDeck = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { projects, loading: projectsLoading, error: projectsError } = useUserProjects(profile?.id);
  const selectEntity = useAppStore(state => state.selectEntity);
  const [isMinimized, setIsMinimized] = useState(false); // Use useState
  const [chronicleData, setChronicleData] = useState([]);
  const [loadingChronicle, setLoadingChronicle] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      const fetchChronicle = async () => {
        setLoadingChronicle(true);
        try {
          const [chronicleRes, summariesRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_BACKEND_URL}/storyChronicles/user/${profile.id}/chronicle`),
            fetch(`${import.meta.env.VITE_BACKEND_URL}/story_engine_v2/summaries/user/${profile.id}?type=weekly%20wrap-up`)
          ]);

          const chronicleData = await chronicleRes.json();
          const summariesData = summariesRes.ok ? await summariesRes.json() : [];

          const combinedData = [
            ...(Array.isArray(chronicleData) ? chronicleData : []),
            ...(Array.isArray(summariesData) ? summariesData : [])
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          setChronicleData(combinedData.slice(0, 3)); // Only show latest 3 in HUD
        } catch (err) {
          console.error("Error fetching HUD chronicle:", err);
        } finally {
          setLoadingChronicle(false);
        }
      };
      fetchChronicle();
    }
  }, [profile?.id]);

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || projectsLoading) {
    return <div className="hud-panel command-deck">Loading Commmand Deck...</div>;
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
        <div className="hud-panel-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
           {projects.length > 0 ? (

        <ul>

          {projects.map(p => (

            <li key={p.id} className="project-item">

              <div className="project-info">

                <span
                  className="project-name"
                  onClick={() => selectEntity({ id: `project-${p.id}`, type: 'project', name: p.name, status: 'active', raw: p })}
                  style={{ textDecoration: 'none', color: '#00f3ff', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {p.name}
                </span>
                <br />
                <span className="project-details">

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

              {p.errorFetchingTasks && <span className="error-text"> (Error loading project tasks)</span>}

            </li>

          ))}

        </ul>

      ) : (

        <p>No projects currently managed.</p>
      )}
          <div className="deck-chronicle-preview" style={{ marginTop: '20px' }}>
            <ChronicleTimeline stories={chronicleData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandDeck;
