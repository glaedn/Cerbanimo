import React from 'react';
import { Link } from 'react-router-dom';
import { FocusCard, SignalChip, ExpandablePanel } from '../../../components/shared/Primitives';
import './OrbitComponents.css';

export const FocusPanel = () => {
  return (
    <div className="orbit-focus-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">SYSTEMS_ACTIVE</span>
        <h3>Current Focus</h3>
      </div>

      <FocusCard
        title="Complete Regional Infrastructure Audit"
        description="Review the latest spatial strain signals and approve pending maintenance tasks in Sector 7. Your coordination is required for deployment."
        actionLabel="Resume Execution"
        onAction={() => console.log('Resume Action')}
      />

      <div className="secondary-focus-grid">
        <div className="mini-focus-item">
          <SignalChip label="Urgent" type="error" />
          <span>Approve Task #402</span>
        </div>
        <div className="mini-focus-item">
          <SignalChip label="Sync" type="info" />
          <span>Coordinate with 'Nexus' Guild</span>
        </div>
      </div>
    </div>
  );
};

export const MomentumPanel = () => {
  return (
    <div className="orbit-momentum-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">PERSONAL_GROWTH</span>
        <h3>Momentum</h3>
      </div>
      <div className="momentum-grid">
        <div className="momentum-stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL_XP</span>
            <span className="stat-value">12,450</span>
          </div>
          <div className="stat-progress-bar">
            <div className="progress-fill" style={{ width: '65%' }}></div>
          </div>
          <span className="stat-sub">340 XP to Level 19</span>
        </div>

        <div className="momentum-mini-stats">
          <div className="mini-stat">
            <span className="mini-label">STREAK</span>
            <span className="mini-value">5 DAYS</span>
          </div>
          <div className="mini-stat">
            <span className="mini-label">IMPACT</span>
            <span className="mini-value">HIGH</span>
          </div>
        </div>
      </div>

      <div className="skill-growth-preview">
        <h4>Recent Skill Growth</h4>
        <div className="skill-bar">
          <span>Spatial Logic</span>
          <div className="bar"><div className="fill" style={{ width: '80%' }}></div></div>
        </div>
        <div className="skill-bar">
          <span>Logistics</span>
          <div className="bar"><div className="fill" style={{ width: '45%' }}></div></div>
        </div>
      </div>
    </div>
  );
};

export const ConstellationActivity = () => {
  const events = [
    { id: 1, type: 'team', message: 'Nexus Bridge project reached 75% completion.', time: '2h ago' },
    { id: 2, type: 'community', message: 'Greenwood Commons added 5 new resources.', time: '5h ago' },
    { id: 3, type: 'story', message: 'New Regional Signal detected in Sector 9.', time: '1d ago' },
  ];

  return (
    <div className="orbit-constellation-activity">
      <div className="orbit-section-header">
        <span className="orbit-kicker">NETWORK_SIGNALS</span>
        <h3>Constellation Activity</h3>
      </div>
      <div className="chronicle-items">
        {events.map((event) => (
          <div key={event.id} className="chronicle-item">
            <div className={`event-dot ${event.type}`}></div>
            <div className="event-content">
              <p>{event.message}</p>
              <small>{event.time}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OpportunityPanel = () => {
  return (
    <div className="orbit-opportunity-panel">
      <div className="orbit-section-header">
        <span className="orbit-kicker">LOCAL_NEED_MATCHES</span>
        <h3>Nearby Opportunities</h3>
      </div>
      <div className="opportunity-list">
        <ExpandablePanel
          title="Infrastructure Support Needed"
          summary="3 active needs in your area"
        >
          <div className="opp-details">
            <p>Nexus Bridge: Backend optimization</p>
            <p>Sector 7: Water quality sensors</p>
            <button className="orbit-btn ghost x-small">Explore Commons</button>
          </div>
        </ExpandablePanel>
      </div>
    </div>
  );
};

export const QuickActions = () => {
  return (
    <div className="orbit-quick-actions">
      <div className="orbit-section-header">
        <span className="orbit-kicker">COMMAND_ARRAY</span>
        <h3>Quick Actions</h3>
      </div>
      <div className="action-buttons">
        <Link to="/missions/projects" className="action-btn">Open Mission</Link>
        <Link to="/commons/marketplace" className="action-btn">Offer Resource</Link>
        <Link to="/commons/needs" className="action-btn">Ask for Help</Link>
        <Link to="/missions/tasks" className="action-btn">Create Task</Link>
        <Link to="/orbit/focus" className="action-btn">Log Contribution</Link>
      </div>
    </div>
  );
};

export const OrbitHUD = () => {
  return (
    <div className="orbit-hud-overlay">
      <div className="hud-metric">
        <span className="metric-label">SYS_STABILITY</span>
        <span className="metric-value">98.4%</span>
      </div>
    </div>
  );
};
