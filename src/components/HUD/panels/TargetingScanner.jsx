import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useRelevantTasks from '../../../hooks/useRelevantTasks'; // Adjust path
import { useIsMobile } from '../../../hooks/useIsMobile';
import '../HUDPanel.css'; // Shared panel styles
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react'; // Adjust path if needed
// import './TargetingScanner.css'; // Optional: For specific TargetingScanner styles

const TargetingScanner = () => {
  const isMobile = useIsMobile();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { relevantTasks, loading: tasksLoading, error: tasksError, refetchTasks } = useRelevantTasks(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const { logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || tasksLoading) {
    return <div className="hud-panel targeting-scanner">Loading Targeting Scanner...</div>;
  }
  if (profileError) {
    return <div className="hud-panel targeting-scanner">Error loading profile: {profileError.message}</div>;
  }
  if (tasksError) {
    return <div className="hud-panel targeting-scanner">Error loading tasks: {tasksError.message}</div>;
  }
  if (!profile) {
    return <div className="hud-panel targeting-scanner">User profile not available for targeting.</div>;
  }

  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className={`hud-panel targeting-scanner ${isMinimized ? 'minimized' : ''} ${isMobile ? 'mobile-scanner' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"} style={{ height: isMobile ? '48px' : 'auto' }}>
        <h4>{isMobile ? 'SCANNER' : 'Targeting Scanner (Relevant Tasks)'}</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Targeting Scanner" : "Minimize Targeting Scanner"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content" style={{ p: isMobile ? 1 : 2 }}>
          {relevantTasks.length > 0 ? (
            <ul className="task-list">
              {relevantTasks.map(task => {
                const isUrgent = task.status && task.status.toLowerCase().includes('urgent');
                return (
                  <li 
                  key={task.id} 
                  className={`task-item ${isUrgent ? 'urgent-task' : ''}`}
                  style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 2 }}
                  >
                  <div className="task-info">
                    <span
                    className="task-name"
                    style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold', color: '#00f3ff', fontSize: isMobile ? '0.85rem' : '1rem' }}
                    onClick={() => window.open(`${import.meta.env.VITE_FRONTEND_URL}/visualizer/${task.project_id}/${task.id}`, '_blank')}
                    title="View task in visualizer"
                    >
                    {task.name}
                    </span>
                    <br/>
                    <span style={{ fontSize: '0.75rem' }}>Status: {task.status}</span>
                    <br />
                    <span style={{ fontSize: '0.75rem' }}>Skill: {task.skill_name ? `${task.skill_name}, Lvl ${task.requiredSkillLevel}` : `ID ${task.requiredSkillId}, Lvl ${task.requiredSkillLevel}`}</span>
                    <br />
                    <span style={{ fontSize: '0.75rem' }}>Sensitivity: {task.timeSensitivity}</span>
                  </div>
                  <div className="task-actions" style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                    {task.assigned_user_ids?.includes(Number(profile.id)) ? (
                    <button 
                      style={{ backgroundColor: '#ff4444', borderColor: '#ff4444', color: '#0A0A2E', height: isMobile ? '48px' : 'auto', minWidth: isMobile ? '80px' : 'auto' }}
                      onClick={async () => {
                      try {
                        const token = await getAccessTokenSilently();
                        await axios.put(
                        `${import.meta.env.VITE_BACKEND_URL}/tasks/${task.id}/drop`,
                        { userId: profile.id },
                        {
                          headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                          }
                        }
                        );
                        alert(`Task "${task.name}" dropped successfully!`);
                        refetchTasks(); // Refetch tasks after dropping
                      } catch (error) {
                        console.error('Error dropping task:', error);
                        // Handle error appropriately
                      }
                      }}
                    >
                      Drop
                    </button>
                    ) : (
                    <button 
                      style={{ backgroundColor: accentGreen, borderColor: accentGreen, color: '#0A0A2E', height: isMobile ? '48px' : 'auto', minWidth: isMobile ? '80px' : 'auto' }}
                      onClick={async () => {
                      try {
                        const token = await getAccessTokenSilently();
                        const response = await axios.put(
                        `${import.meta.env.VITE_BACKEND_URL}/tasks/${task.id}/accept`,
                        { userId: profile.id },
                        {
                          headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                          }
                        }
                        );
                        if (response.status === 200) {
                        alert(`Task "${task.name}" accepted successfully!`);
                        refetchTasks(); // Refetch tasks after accepting
                        }
                      } catch (error) {
                        console.error('Error accepting task:', error);
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
            <p style={{ fontStyle: 'italic', color: '#888' }}>No relevant tasks found by scanner.</p>
          )}
        </div>
      )}
    </div>
  );
};
export default TargetingScanner;
