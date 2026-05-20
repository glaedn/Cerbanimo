import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { MissionPulse, ActiveMissionsList, ReviewQueue } from './components';
import './MissionsPage.css';

const MissionsPage = () => {
  const location = useLocation();
  const isIndex = location.pathname.replace(/\/$/, '') === '/missions';

  return (
    <div className="missions-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">MISSION_CONTROL</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>{isIndex ? 'Tactical Overview' : 'Operation Details'}</h2>
          {isIndex && (
            <div className="signal-group" style={{ display: 'flex', gap: '1rem' }}>
              <SignalChip label="Active" value="4" type="accent" />
              <SignalChip label="Pending" value="2" />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="missions-index-layout">
            <div className="missions-main">
              <FocusCard
                title="Sustain Local Food Sovereignty"
                kicker="Active Mission"
                status="ACTION_REQUIRED"
                type="urgent"
              >
                <p>Strategic intervention required in the regional distribution hub. Coordinate with community leaders to resolve logistic bottlenecks.</p>
              </FocusCard>

              <div className="missions-section">
                <h3>Pulse</h3>
                <MissionPulse />
              </div>

              <div className="missions-section">
                <h3>Active Missions</h3>
                <ActiveMissionsList />
              </div>
            </div>
            <div className="missions-sidebar">
              <ReviewQueue />
              <div className="quick-actions-panel glass-panel">
                <h4>Quick Actions</h4>
                <button className="orbit-btn primary full-width" style={{ marginBottom: '0.5rem' }}>Create New Project</button>
                <button className="orbit-btn ghost full-width">Browse All Tasks</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="missions-sub-content">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
};

export default MissionsPage;
