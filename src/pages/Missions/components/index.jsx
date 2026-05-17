import React from 'react';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import './MissionsComponents.css';

export const MissionPulse = () => {
  return (
    <div className="mission-pulse">
      <div className="orbit-section-header">
        <span className="orbit-kicker">OPERATIONAL_AWARENESS</span>
        <h3>Mission Pulse</h3>
      </div>
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="pulse-label">ACTIVE_MISSIONS</span>
          <span className="pulse-value">4</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">PENDING_REVIEW</span>
          <span className="pulse-value">2</span>
        </div>
        <div className="pulse-card">
          <span className="pulse-label">TEAM_VELOCITY</span>
          <span className="pulse-value">84%</span>
        </div>
      </div>
    </div>
  );
};

export const ActiveMissionsList = () => {
  const missions = [
    { id: 1, title: 'Nexus Bridge Phase 2', status: 'In Progress', progress: 65, priority: 'High' },
    { id: 2, title: 'Regional Grid Audit', status: 'Blocked', progress: 30, priority: 'Critical' },
  ];

  return (
    <div className="active-missions-list">
      <div className="orbit-section-header">
        <span className="orbit-kicker">CURRENT_ASSIGNMENTS</span>
        <h3>Active Missions</h3>
      </div>
      <div className="missions-grid">
        {missions.map(mission => (
          <FocusCard
            key={mission.id}
            title={mission.title}
            description={`Status: ${mission.status} | Priority: ${mission.priority}`}
            actionLabel="Open Command View"
            onAction={() => console.log('Open Mission', mission.id)}
          />
        ))}
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
