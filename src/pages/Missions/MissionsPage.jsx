import React from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import { MissionPulse, ActiveMissionsList, ReviewQueue } from './components';
import { useIntelligence } from '../../hooks/useIntelligence';
import { useUserProfile } from '../../hooks/useUserProfile';
import useAssignedTasks from '../../hooks/useAssignedTasks';
import './MissionsPage.css';

const MissionsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCoordinator } = useUserRoleProfile();
  const { profile } = useUserProfile();
  const { assignedTasks = [] } = useAssignedTasks(profile?.id);
  const { pulse } = useIntelligence({ pollInterval: 45000 });

  const activeGuidance = React.useMemo(() =>
    pulse?.signals?.find(s => s.type === 'guidance'),
    [pulse]
  );

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
              <SignalChip label="Active" value={assignedTasks.filter(t => t.status === 'active' || t.status === 'in-progress').length.toString()} type="accent" />
              <SignalChip label="Pending" value={assignedTasks.filter(t => t.status === 'pending' || t.status === 'awaiting-approval').length.toString()} />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="missions-index-layout">
            <div className="missions-main">
              {activeGuidance ? (
                <FocusCard
                  title={activeGuidance.title || "Strategic Guidance"}
                  kicker="Active Guidance"
                  status="ACTION_REQUIRED"
                  type="urgent"
                  onAction={() => activeGuidance.path && navigate(activeGuidance.path)}
                  actionLabel="Address Signal"
                >
                  <p>{activeGuidance.message}</p>
                </FocusCard>
              ) : (
                <FocusCard
                  title="Sustain Local Food Sovereignty"
                  kicker="Active Mission"
                  status="ACTION_REQUIRED"
                  type="urgent"
                >
                  <p>Strategic intervention required in the regional distribution hub. Coordinate with community leaders to resolve logistic bottlenecks.</p>
                </FocusCard>
              )}

              <div className="missions-section">
                <h3>Pulse</h3>
                <MissionPulse />
              </div>

              <div className="missions-section">
                <h3>Active Missions</h3>
                <ActiveMissionsList />
              </div>

              <section className="missions-mobile-nav mobile-only">
                <h3>Navigation</h3>
                <div className="mobile-nav-grid">
                  <button onClick={() => navigate('/missions/projects')} className="nav-card">
                    <span className="icon">📂</span>
                    <span className="label">Projects</span>
                  </button>
                  <button onClick={() => navigate('/missions/tasks')} className="nav-card">
                    <span className="icon">✅</span>
                    <span className="label">Tasks</span>
                  </button>
                  <button onClick={() => navigate('/missions/projectcreation')} className="nav-card">
                    <span className="icon">➕</span>
                    <span className="label">New Project</span>
                  </button>
                  <button onClick={() => navigate('/missions/review')} className="nav-card">
                    <span className="icon">🔍</span>
                    <span className="label">Review</span>
                  </button>
                </div>
              </section>
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
