import React from 'react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import { useAssignedTasks } from '../../../hooks/useAssignedTasks'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
// import './MissionConsole.css'; // Optional: For specific MissionConsole styles

const MissionConsole = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { assignedTasks, loading: tasksLoading, error: tasksError } = useAssignedTasks(profile?.id);

  if (profileLoading || tasksLoading) return <div className="hud-panel mission-console">Loading Mission Console...</div>;
  if (profileError) return <div className="hud-panel mission-console">Error loading profile: {profileError.message}</div>;
  if (tasksError) return <div className="hud-panel mission-console">Error loading tasks: {tasksError.message}</div>;
  if (!profile) return <div className="hud-panel mission-console">User profile not available.</div>;

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes('completed') || s.includes('archived')) return '#00D787'; // theme.colors.accentGreen
    if (s.includes('active') || s.includes('progress')) return '#FF9F40'; // theme.colors.accentOrange
    return '#CCCCCC'; // theme.colors.textSecondary
  };

  return (
    <div className="hud-panel mission-console">
      <div className="hud-panel-header">
        <h4>Mission Console (Assigned Tasks)</h4>
      </div>
      {assignedTasks.length > 0 ? (
        <ul>
          {assignedTasks.map(task => (
            <li key={task.id} className="task-item">
              <div className="task-info">
                <span className="task-name">{task.name}</span> ({task.projectName})
                <br />
                Status: <span style={{ color: getStatusColor(task.status), fontWeight: 'bold' }}>{task.status}</span>
                {task.timeRemaining !== 'N/A' && <span> - Time Left: {task.timeRemaining}</span>}
              </div>
              <div className="task-actions">
                <button onClick={() => console.log('View task', task.id)}>View</button>
                <button onClick={() => console.log('Submit proof for task', task.id)}>Submit Proof</button>
                <button onClick={() => console.log('Drop task', task.id)}>Drop</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tasks currently assigned.</p>
      )}
    </div>
  );
};
export default MissionConsole;
