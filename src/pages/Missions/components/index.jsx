import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useUserProjects from '../../../hooks/useUserProjects';
import useAssignedTasks from '../../../hooks/useAssignedTasks';
import './MissionsComponents.css';

export const MissionPulse = () => {
  const { profile } = useUserProfile();
  const { projects } = useUserProjects(profile?.id);
  const { assignedTasks } = useAssignedTasks(profile?.id);

  return (
    <div className="mission-pulse">
      <div className="orbit-section-header">
        <span className="orbit-kicker">OPERATIONAL_AWARENESS</span>
        <h3>Mission Pulse</h3>
      </div>
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="pulse-label">ACTIVE_PROJECTS</span>
          <span className="pulse-value">{projects?.length || 0}</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">ASSIGNED_TASKS</span>
          <span className="pulse-value">{assignedTasks?.length || 0}</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">SYS_LOAD</span>
          <span className="pulse-value">NOMINAL</span>
        </div>
      </div>
    </div>
  );
};

export const ActiveMissionsList = () => {
  const { profile } = useUserProfile();
  const { assignedTasks, loading } = useAssignedTasks(profile?.id);
  const navigate = useNavigate();

  return (
    <div className="active-missions-list">
      <div className="orbit-section-header">
        <span className="orbit-kicker">CURRENT_ASSIGNMENTS</span>
        <h3>Active Tasks</h3>
      </div>
      <div className="missions-grid">
        {loading ? (
          <p className="placeholder-text">LOADING_TASKS...</p>
        ) : assignedTasks?.length > 0 ? (
          assignedTasks.map(task => (
            <FocusCard
              key={task.id}
              title={task.name}
              kicker={task.projectName}
              status={task.status.toUpperCase()}
              actionLabel="Execute Task"
              onAction={() => navigate(`/missions/visualizer/${task.projectId}/${task.id}`)}
            />
          ))
        ) : (
          <p className="empty-state">No tasks currently assigned. Browse projects to contribute.</p>
        )}
      </div>
    </div>
  );
};

export const ReviewQueue = () => {
  return (
    <div className="review-queue">
      <div className="orbit-section-header">
        <span className="orbit-kicker">QUALITY_ASSURANCE</span>
        <h3>Review Queue</h3>
      </div>
      <ExpandablePanel title="Pending Contributions" summary="2 items awaiting your approval">
        <div className="review-item">
          <p>Sector 7 Maintenance Log</p>
          <SignalChip label="Draft" type="info" />
        </div>
        <div className="review-item">
          <p>Nexus API Documentation</p>
          <SignalChip label="Ready" type="success" />
        </div>
      </ExpandablePanel>
    </div>
  );
};
