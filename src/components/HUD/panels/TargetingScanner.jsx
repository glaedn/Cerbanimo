import React, { useState } from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useRelevantTasks from '../../../hooks/useRelevantTasks'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react'; // Adjust path if needed
// import './TargetingScanner.css'; // Optional: For specific TargetingScanner styles

const TargetingScanner = () => {
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
    <div className={`hud-panel targeting-scanner ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Targeting Scanner (Relevant Tasks)</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Targeting Scanner" : "Minimize Targeting Scanner"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {relevantTasks.length > 0 ? (
            <ul>
              {relevantTasks.map(task => {
                const isUrgent = task.status && task.status.toLowerCase().includes('urgent');
                return (
                  <li 
                  key={task.id} 
                  className={`task-item ${isUrgent ? 'urgent-task' : ''}`}
                  >
                  <div className="task-info">
                  <span className="task-name">{task.name}</span> - Status: {task.status}
                  <br />
                  Skill: {task.skill_name ? `${task.skill_name}, Lvl ${task.requiredSkillLevel}` : `ID ${task.requiredSkillId}, Lvl ${task.requiredSkillLevel}`}
                  <br />
                  Match: {task.skillMatchPercent}% | Sensitivity: {task.timeSensitivity}
                  </div>
                  <div className="task-actions">
                  {task.assigned_user_ids?.includes(Number(profile.id)) ? (
                  <button 
                  style={{ backgroundColor: '#ff4444', borderColor: '#ff4444', color: '#0A0A2E' }}
                  onClick={async () => {
                  try {
                    const token = await getAccessTokenSilently();
                    await axios.put(
                    `http://localhost:4000/tasks/${task.id}/drop`,
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
                  style={{ backgroundColor: accentGreen, borderColor: accentGreen, color: '#0A0A2E' }}
                  onClick={async () => {
                  try {
                    const token = await getAccessTokenSilently();
                    console.log('Accepting task:', task);
                    console.log('User profile ID:', profile.id);
                    const response = await axios.put(
                    `http://localhost:4000/tasks/${task.id}/accept`,
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
            <p>No relevant tasks found by scanner.</p>
          )}
        </div>
      )}
    </div>
  );
};
export default TargetingScanner;
