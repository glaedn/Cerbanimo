import React from 'react';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import './SignalsComponents.css';

export const GlobalPulse = () => {
  return (
    <div className="global-pulse">
      <div className="orbit-section-header">
        <span className="orbit-kicker">PLANETARY_COORDINATION</span>
        <h3>Global Pulse</h3>
      </div>
      <div className="pulse-grid">
        <div className="pulse-card signals">
          <span className="pulse-label">ACTIVE_PROPOSALS</span>
          <span className="pulse-value">8</span>
        </div>
        <div className="pulse-card signals">
          <span className="pulse-label">CRISIS_ALERTS</span>
          <span className="pulse-value">0</span>
        </div>
        <div className="pulse-card signals">
          <span className="pulse-label">IMPACT_SCORE</span>
          <span className="pulse-value">92</span>
        </div>
      </div>
    </div>
  );
};

export const ActiveProposals = () => {
  const proposals = [
    { id: 1, title: 'Authorize Sector 9 Expansion', status: 'Voting', deadline: '12h left' },
    { id: 2, title: 'Update Resource Allocation Protocol', status: 'Draft', deadline: '2d left' },
  ];

  return (
    <div className="active-proposals">
      <div className="orbit-section-header">
        <span className="orbit-kicker">GOVERNANCE_SIGNALS</span>
        <h3>Active Proposals</h3>
      </div>
      <div className="proposals-list">
        {proposals.map(prop => (
          <FocusCard
            key={prop.id}
            title={prop.title}
            description={`Status: ${prop.status} | Deadline: ${prop.deadline}`}
            actionLabel="Cast Vote"
            onAction={() => console.log('Vote on', prop.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const RegionalAlerts = () => {
  return (
    <div className="regional-alerts">
      <div className="orbit-section-header">
        <span className="orbit-kicker">IMMEDIATE_ATTENTION</span>
        <h3>Regional Alerts</h3>
      </div>
      <div className="alerts-container">
        <ExpandablePanel title="Sector 7 Signals" summary="Stability Normal">
          <p>No critical shifts detected in the last 24 hours.</p>
          <SignalChip label="Stable" type="success" />
        </ExpandablePanel>
        <ExpandablePanel title="Federation Updates" summary="1 major shift pending">
          <p>New federation guidelines for resource sharing are being drafted.</p>
          <button className="orbit-btn ghost x-small">View Full Governance</button>
        </ExpandablePanel>
      </div>
    </div>
  );
};
