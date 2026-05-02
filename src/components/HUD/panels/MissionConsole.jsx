import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useAssignedTasks from '../../../hooks/useAssignedTasks';
import { useIsMobile } from '../../../hooks/useIsMobile';
import '../HUDPanel.css';
import './MissionConsole.css';

const MissionConsole = () => {
  const isMobile = useIsMobile();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  const { assignedTasks, loading: tasksLoading, error: tasksError, refetchTasks } = useAssignedTasks(profile?.id);
  const [recommendedMissions, setRecommendedMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [taskOutcomes, setTaskOutcomes] = useState({});
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

                // Fetch outcomes for assigned tasks
                assignedTasks.forEach(async (task) => {
                   try {
                     const traceRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/impact_v2/trace/${task.id}`);
                     const outcome = traceRes.data.find(n => n.type === 'outcome');
                     if (outcome) {
                       setTaskOutcomes(prev => ({ ...prev, [task.id]: outcome.label }));
                     }
                   } catch (e) { console.error(e); }
                });

            } catch (err) {
                console.error("Failed to fetch missions:", err);
            } finally {
                setMissionsLoading(false);
            }
        }
    };
    fetchMissions();
  }, [profile?.id, getAccessTokenSilently, assignedTasks]);

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
    <div className={`hud-panel mission-console ${isMinimized ? 'minimized' : ''} ${isMobile ? 'mobile-mission-console' : ''}`}>
      <div className="hud-panel-header" onClick={toggleMinimize} title={isMinimized ? "Expand Panel" : "Minimize Panel"} style={{ height: isMobile ? '48px' : 'auto' }}>
        <h4>{isMobile ? 'MISSIONS' : 'Mission Console'}</h4>
        <button onClick={toggleMinimize} className="minimize-btn" aria-label={isMinimized ? "Expand Mission Console" : "Minimize Mission Console"}>
          {isMinimized ? '+' : '-'}
        </button>
      </div>
      {!isMinimized && (
        <div className="hud-panel-content" style={{ p: isMobile ? 1 : 2 }}>
          <h5 className="section-subtitle">Assigned Tasks</h5>
          {assignedTasks.length > 0 ? (
            <ul className="task-list">
              {assignedTasks.map(task => (
                <li key={task.id} className="task-item" style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 2 }}>
                  <div className="task-info">
                    <span className="task-name" style={{ fontWeight: 'bold', color: '#00f3ff', fontSize: isMobile ? '0.85rem' : '1rem' }}>{task.name}</span> <br/>
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>({task.projectName})</span>
                    <div className="task-outcome-label" style={{ fontSize: '0.75rem', color: '#ff00ff', margin: '4px 0' }}>
                      WHY: {taskOutcomes[task.id] || 'TRACING IMPACT...'}
                    </div>
                    <span style={{ fontSize: '0.75rem' }}>
                      Status: <span style={{ color: getStatusColor(task.status), fontWeight: 'bold' }}>{task.status}</span>
                    </span>
                  </div>
                  <div className="task-actions" style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                    <button onClick={() => handleViewTask(task)} style={{ height: isMobile ? '48px' : 'auto', minWidth: isMobile ? '80px' : 'auto' }}>VIEW</button>
                    {!(task.status.toLowerCase().includes('submitted') || task.status.toLowerCase().includes('completed')) && (
                      <button onClick={() => handleDropTask(task.id)} style={{ height: isMobile ? '48px' : 'auto', minWidth: isMobile ? '80px' : 'auto' }}>DROP</button>
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
                <li key={mission.id} className="task-item recommended" style={{ flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 2 }}>
                  <div className="task-info">
                    <span className="task-name" style={{ fontWeight: 'bold', color: '#ff5ca2', fontSize: isMobile ? '0.85rem' : '1rem' }}>{mission.name}</span> <br/>
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>({mission.project_name})</span>
                    <br />
                    <span style={{ color: '#00f3ff', fontSize: '0.8rem' }}>Reward: {mission.reward_tokens} Tokens</span>
                  </div>
                  <div className="task-actions" style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                    <button onClick={() => navigate(`/visualizer/${mission.project_id}/${mission.id}`)} style={{ height: isMobile ? '48px' : 'auto', minWidth: isMobile ? '80px' : 'auto' }}>ACCEPT</button>
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
