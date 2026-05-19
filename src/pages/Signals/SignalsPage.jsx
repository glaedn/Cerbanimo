import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { GlobalPulse, ActiveProposals, RegionalAlerts } from './components';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import { useUserProfile } from '../../hooks/useUserProfile';
import './SignalsPage.css';

const SignalsPage = () => {
  const { isNewUser } = useUserRoleProfile();
  const { profile } = useUserProfile();
  const location = useLocation();
  const isIndex = location.pathname.replace(/\/$/, '') === '/signals';

  // Use profile's community or default to 1 for global governance
  const primaryCommunityId = profile?.primary_community_id || 1;

  return (
    <div className="signals-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">SIGNALS</span>
        <h2>{isIndex ? 'Coordination Overview' : 'Advanced Systems'}</h2>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="signals-index-layout">
            <div className="signals-main">
              <GlobalPulse />
              <ActiveProposals />
            </div>
            <div className="signals-sidebar">
              <RegionalAlerts />
              {!isNewUser && (
                <div className="governance-access-panel">
                  <h4>Advanced Systems</h4>
                  <Link to={`/signals/governance/${primaryCommunityId}`} className="signals-btn">Open Full Governance</Link>
                  <Link to="/signals/impact" className="signals-btn">View Impact Atlas</Link>
                  <Link to="/signals/activity-map" className="signals-btn">Regional Coordination</Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="signals-sub-content">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsPage;
