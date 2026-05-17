import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalPulse, ActiveProposals, RegionalAlerts } from './components';
import { useUserRoleProfile } from '../../hooks/useUserRoleProfile';
import './SignalsPage.css';

const SignalsPage = () => {
  const { isNewUser } = useUserRoleProfile();
  const location = useLocation();
  const isIndex = location.pathname === '/signals' || location.pathname === '/signals/';

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
                  <button className="signals-btn">Open Full Governance</button>
                  <button className="signals-btn">View Impact Atlas</button>
                  <button className="signals-btn">Regional Coordination</button>
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
