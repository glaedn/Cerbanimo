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
  const [recommendedMissions, setRecommendedMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchMissions = async () => {
        if (profile?.id) {
            setMissionsLoading(true);
            try {
                const token = await getAccessTokenSilently();
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/matching/missions/${profile.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecommendedMissions(res.data || []);
            } catch (err) {
                console.error("Failed to fetch missions:", err);
            } finally {
                setMissionsLoading(false);
            }
        }
    };
    fetchMissions();
  }, [profile?.id, getAccessTokenSilently]);

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
        <h4>Mission Console</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Mission Console" : "Minimize Mission Console"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content">
          <h5 className="section-subtitle">Assigned Tasks</h5>
          {assignedTasks.length > 0 ? (
            <ul className="task-list">
              {assignedTasks.map(task => (
                <li key={task.id} className="task-item">
                  <div className="task-info">
                    <span className="task-name" style={{ fontWeight: 'bold', color: '#00f3ff' }}>{task.name}</span> <br/> ({task.projectName})
                    <br />
                    Status: <span style={{ color: getStatusColor(task.status), fontWeight: 'bold' }}>{task.status}</span>
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
            <p style={{ fontStyle: 'italic', color: '#888' }}>No tasks currently assigned.</p>
          )}

          <h5 className="section-subtitle recommended">Recommended for You</h5>
          {missionsLoading ? (
            <p className="loading-text">Scanning datacore...</p>
          ) : recommendedMissions.length > 0 ? (
            <ul className="task-list">
              {recommendedMissions.slice(0, 3).map(mission => (
                <li key={mission.id} className="task-item recommended">
                  <div className="task-info">
                    <span className="task-name" style={{ fontWeight: 'bold', color: '#ff5ca2' }}>{mission.name}</span> <br/> ({mission.project_name})
                    <br />
                    <span style={{ color: '#00f3ff', fontSize: '0.8rem' }}>Reward: {mission.reward_tokens} Tokens</span>
                  </div>
                  <div className="task-actions">
                    <button onClick={() => navigate(`/visualizer/${mission.project_id}/${mission.id}`)}>Accept</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontStyle: 'italic', color: '#888' }}>No unique matches found.</p>
          )}
        </div>
      )}
    </div>
  );
};
export default MissionConsole;
