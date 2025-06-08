import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../../hooks/useUserProfile'; // Adjust path
import useAssignedTasks from '../../../hooks/useAssignedTasks'; // Adjust path
import '../HUDPanel.css'; // Shared panel styles
import './MissionConsole.css'; // Optional: For specific MissionConsole styles

const MissionConsole = () => {
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { assignedTasks, loading: tasksLoading, error: tasksError, refetchTasks } = useAssignedTasks(profile?.id);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const toggleMinimize = (e) => {
    if (e && e.currentTarget.tagName === 'BUTTON' && e.target.tagName === 'BUTTON') {
      e.stopPropagation();
    }
    setIsMinimized(!isMinimized);
  };

  if (profileLoading || tasksLoading) {
    return <div className="hud-panel mission-console">Loading Mission Console...</div>;
  }
  if (profileError) {
    return <div className="hud-panel mission-console">Error loading profile: {profileError.message}</div>;
  }
  if (tasksError) {
    return <div className="hud-panel mission-console">Error loading tasks: {tasksError.message}</div>;
  }
  if (!profile) {
    return <div className="hud-panel mission-console">User profile not available.</div>;
  }

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes('active')) return '#32CD32'; // Green
    if (s.includes('inactive')) return '#87CEFA'; // Blue
    if (s.includes('submitted')) return '#FFA500'; // Orange
    if (s.includes('completed')) return '#FF69B4'; // Pink
    return '#CCCCCC'; // Default/Other
  };

  const handleViewTask = (task) => {
    navigate(`/visualizer/${task.projectId}/${task.id}`);
  };

  const handleDropTask = async (taskId) => {
    if (!profile || !profile.id) {
      alert('User profile not found. Cannot drop task.');
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/tasks/${taskId}/drop`,
        { userId: profile.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Task dropped successfully.');
      refetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error dropping task:', error.response?.data || error.message);
      alert(`Failed to drop task: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className={`hud-panel mission-console ${isMinimized ? 'minimized' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"}>
        <h4>Mission Console (Assigned Tasks)</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Mission Console" : "Minimize Mission Console"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          {assignedTasks.length > 0 ? (
            <ul>
              {assignedTasks.map(task => (
                <li key={task.id} className="task-item">
                  <div className="task-info">
                    <span className="task-name">{task.name}</span> <br/> ({task.projectName})
                    <br />
                    Status: <span style={{ color: getStatusColor(task.status), fontWeight: 'bold' }}>{task.status}</span>
                    {task.timeRemaining !== 'N/A' && <span> - Time Left: {task.timeRemaining}</span>}
                  </div>
                  <div className="task-actions">
                    <button onClick={() => handleViewTask(task)}>View</button>
                    {!(task.status.toLowerCase().includes('submitted') || task.status.toLowerCase().includes('completed')) && (
                      <button onClick={() => handleDropTask(task.id)}>Drop</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No tasks currently assigned.</p>
          )}
        </div>
      )}
    </div>
  );
};
export default MissionConsole;
