import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import { MissionPulse, ActiveMissionsList, ReviewQueue } from './components';
import './MissionsPage.css';

const MissionsPage = () => {
  const location = useLocation();
  const { isCoordinator } = useUserRoleProfile();
  // Index view for Missions is now specifically the '/missions/active' route
  const isIndex = location.pathname.replace(/\/$/, '') === '/missions' ||
                  location.pathname.replace(/\/$/, '') === '/missions/active';

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
              {isCoordinator && <ReviewQueue />}
              <div className="quick-actions-panel glass-panel">
                <h4>Quick Actions</h4>
                <Link to="/missions/projectcreation" className="orbit-btn primary full-width" style={{ marginBottom: '0.5rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>Create New Project</Link>
                <Link to="/missions/tasks" className="orbit-btn ghost full-width" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Browse All Tasks</Link>
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
