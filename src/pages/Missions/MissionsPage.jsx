import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MissionPulse, ActiveMissionsList, ReviewQueue } from './components';
import './MissionsPage.css';

const MissionsPage = () => {
  const location = useLocation();
  const isIndex = location.pathname === '/missions' || location.pathname === '/missions/';

  return (
    <div className="missions-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">MISSION_CONTROL</span>
        <h2>{isIndex ? 'Tactical Overview' : 'Operation Details'}</h2>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="missions-index-layout">
            <div className="missions-main">
              <MissionPulse />
              <ActiveMissionsList />
            </div>
            <div className="missions-sidebar">
              <ReviewQueue />
              <div className="quick-actions-panel">
                <h4>Quick Actions</h4>
                <button className="orbit-btn ghost full-width">Create New Project</button>
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
