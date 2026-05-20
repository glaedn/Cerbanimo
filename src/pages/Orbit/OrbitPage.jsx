import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import useAssignedTasks from '../../hooks/useAssignedTasks';
import {
  MomentumPanel,
  ConstellationActivity,
  OpportunityPanel,
  QuickActions,
  OrbitHUD
} from './components';
import './OrbitPage.css';

const OrbitPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { isCoordinator } = useUserRoleProfile();
  const { assignedTasks, loading: tasksLoading } = useAssignedTasks(profile?.id);

  // Resilient index detection that ignores trailing slashes and search params
  const isIndex = location.pathname.replace(/\/$/, '') === '/orbit';

  const primaryTask = assignedTasks?.length > 0 ? assignedTasks[0] : null;

  return (
    <div className="orbit-page-container">
      <div className="orbit-hud-layer">
        <OrbitHUD />
      </div>

      <div className="orbit-layout-grid">
        <div className="orbit-main-column">
          {isIndex ? (
            <>
              <section className="orbit-section focus">
                {isCoordinator && (
                  <div className="coordinator-badge" style={{
                    fontFamily: 'Orbitron',
                    fontSize: '0.65rem',
                    color: '#5ff0ff',
                    marginBottom: '0.5rem',
                    border: '1px solid rgba(95, 240, 255, 0.3)',
                    padding: '2px 8px',
                    display: 'inline-block',
                    borderRadius: '4px'
                  }}>
                    COORDINATOR_MODE_ACTIVE
                  </div>
                )}
                {tasksLoading ? (
                  <p className="placeholder-text">LOADING_FOCUS_OBJECTIVE...</p>
                ) : primaryTask ? (
                  <FocusCard
                    title={primaryTask.name}
                    kicker="Current Focus"
                    status={primaryTask.status.toUpperCase()}
                    actions={
                      <>
                        <button
                          className="orbit-btn primary"
                          onClick={() => navigate(`/missions/visualizer/${primaryTask.projectId}/${primaryTask.id}`)}
                        >
                          Execute Mission
                        </button>
                        <button className="orbit-btn ghost" onClick={() => navigate('/missions')}>View All</button>
                      </>
                    }
                  >
                    <p>Current assignment within <strong>{primaryTask.projectName}</strong>. Your immediate contribution is requested to maintain momentum.</p>
                    <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                      <SignalChip label="Project" value={primaryTask.projectName} icon="🚀" />
                      <SignalChip label="Status" value={primaryTask.status} icon="📡" type="accent" />
                    </div>
                  </FocusCard>
                ) : (
                  <FocusCard
                    title="No Active Missions"
                    kicker="Strategic Advisory"
                    status="READY"
                    actions={
                      <button className="orbit-btn primary" onClick={() => navigate('/missions')}>Browse Missions</button>
                    }
                  >
                    <p>You have no current assignments. Explore Mission Control to find projects aligning with your skills or check the Commons for community needs.</p>
                  </FocusCard>
                )}
              </section>

              <section className="orbit-section momentum">
                <MomentumPanel />
              </section>

              <section className="orbit-section activity">
                <ConstellationActivity />
              </section>

              <section className="orbit-mobile-nav mobile-only">
                <h3>Navigation</h3>
                <div className="mobile-nav-grid">
                  <button onClick={() => navigate('/orbit/profile')} className="nav-card">
                    <span className="icon">👤</span>
                    <span className="label">Profile</span>
                  </button>
                  <button onClick={() => navigate('/orbit/skills')} className="nav-card">
                    <span className="icon">💠</span>
                    <span className="label">Skills</span>
                  </button>
                  <button onClick={() => navigate('/orbit/notifications')} className="nav-card">
                    <span className="icon">🔔</span>
                    <span className="label">Notifications</span>
                  </button>
                  <button onClick={() => navigate('/orbit/interest-library')} className="nav-card">
                    <span className="icon">🧠</span>
                    <span className="label">Interests</span>
                  </button>
                </div>
              </section>
            </>
          ) : (
            <div className="orbit-sub-content">
              <Outlet />
            </div>
          )}
        </div>

        <div className="orbit-side-column">
          <section className="orbit-section">
            <QuickActions />
          </section>

          <section className="orbit-section">
            <OpportunityPanel />
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrbitPage;
