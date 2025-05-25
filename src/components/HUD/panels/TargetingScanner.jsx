import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useRelevantTasks from '../../../hooks/useRelevantTasks'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
// import './TargetingScanner.css'; // Optional: For specific TargetingScanner styles

const TargetingScanner = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { relevantTasks, loading: tasksLoading, error: tasksError } = useRelevantTasks(profile?.id);

  if (profileLoading || tasksLoading) return <div className="hud-panel targeting-scanner">Loading Targeting Scanner...</div>;
  if (profileError) return <div className="hud-panel targeting-scanner">Error loading profile: {profileError.message}</div>;
  if (tasksError) return <div className="hud-panel targeting-scanner">Error loading tasks: {tasksError.message}</div>;
  if (!profile) return <div className="hud-panel targeting-scanner">User profile not available for targeting.</div>;

  const accentGreen = '#00D787'; // theme.colors.accentGreen

  return (
    <div className="hud-panel targeting-scanner">
      <div className="hud-panel-header">
        <h4>Targeting Scanner (Relevant Tasks)</h4>
      </div>
      {relevantTasks.length > 0 ? (
        <ul>
          {relevantTasks.map(task => {
            const isUrgent = task.status && task.status.toLowerCase().includes('urgent');
            // const isNewMatch = ...; // Logic for identifying new matches if applicable

            return (
              <li 
                key={task.id} 
                className={`task-item ${isUrgent ? 'urgent-task' : ''}`} // Apply urgent-task class
              >
                <div className="task-info">
                  <span className="task-name">{task.name}</span> - Status: {task.status}
                  <br />
                  Skill: {task.requiredSkillId ? `ID ${task.requiredSkillId}, Lvl ${task.requiredSkillLevel}` : 'N/A'}
                  <br />
                  Match: {task.skillMatchPercent}% | Sensitivity: {task.timeSensitivity}
                </div>
                <div className="task-actions">
                  <button 
                    style={{ backgroundColor: accentGreen, borderColor: accentGreen, color: '#0A0A2E' }}
                    onClick={() => console.log('Assign task', task.id)}
                  >
                    Assign
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No relevant tasks found by scanner.</p>
      )}
    </div>
  );
};
export default TargetingScanner;
