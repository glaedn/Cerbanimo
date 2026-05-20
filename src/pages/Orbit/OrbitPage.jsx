import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserProfile } from '../../hooks/useUserProfile';
import useAssignedTasks from '../../hooks/useAssignedTasks';
import {
  OpportunityPanel,
  QuickActions,
  OrbitHUD
} from './components';
import ContributorOrbitView from './views/ContributorOrbitView';
import CoordinatorOrbitView from './views/CoordinatorOrbitView';
import StewardOrbitView from './views/StewardOrbitView';
import ExplorerOrbitView from './views/ExplorerOrbitView';
import './OrbitPage.css';

const OrbitPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserProfile();
  const { assignedTasks, loading: tasksLoading } = useAssignedTasks(profile?.id);

  // Resilient index detection that ignores trailing slashes and search params
  const isIndex = location.pathname.replace(/\/$/, '') === '/orbit';

  const renderRoleSpecificView = () => {
    if (profileLoading || tasksLoading) {
      return <p className="placeholder-text">LOADING_EXPERIENCE...</p>;
    }

    const { roleProfile } = profile;
    const primaryRole = roleProfile?.primaryRole || 'Explorer';

    switch (primaryRole) {
      case 'Contributor':
        return <ContributorOrbitView profile={profile} tasks={assignedTasks} navigate={navigate} />;
      case 'Coordinator':
        return <CoordinatorOrbitView profile={profile} navigate={navigate} />;
      case 'Steward':
      case 'Governance Participant':
        return <StewardOrbitView profile={profile} navigate={navigate} />;
      default:
        return <ExplorerOrbitView profile={profile} navigate={navigate} />;
    }
  };

  return (
    <div className="orbit-page-container">
      <div className="orbit-hud-layer">
        <OrbitHUD />
      </div>

      <div className="orbit-layout-grid">
        <div className="orbit-main-column">
          {isIndex ? (
            <>
              {renderRoleSpecificView()}

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
