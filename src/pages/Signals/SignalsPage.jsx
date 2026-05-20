import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import './SignalsPage.css';

const SignalsPage = () => {
  const location = useLocation();
  const isIndex = location.pathname.replace(/\/$/, '') === '/signals';

  return (
    <div className="signals-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">SIGNALS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>{isIndex ? 'Governance & Governance' : 'Signal Details'}</h2>
          {isIndex && (
            <div className="signal-group" style={{ display: 'flex', gap: '1rem' }}>
              <SignalChip label="Proposals" value="3" icon="⚖️" type="accent" />
              <SignalChip label="Impact Score" value="842" trend={8} icon="💎" />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="signals-index-layout">
            <div className="signals-main">
              <FocusCard
                title="Regional Resource Allocation"
                kicker="Active Proposal"
                status="VOTING_PERIOD"
                actions={
                  <>
                    <button className="orbit-btn primary">Cast Vote</button>
                    <button className="orbit-btn ghost">Read Full Proposal</button>
                  </>
                }
              >
                <p>Prop #432: Reallocating surplus energy credits to the vertical farming guild for winter operations.</p>
              </FocusCard>

              <div className="signals-grid">
                <div className="signals-card glass-panel">
                  <h3>Major Shifts</h3>
                  <div className="placeholder-content">SIGNALS_DECODING...</div>
                </div>
                <div className="signals-card glass-panel">
                  <h3>Federation Updates</h3>
                  <div className="placeholder-content">NET_TRAFFIC_STABLE</div>
                </div>
              </div>
            </div>

            <div className="signals-sidebar">
               <div className="sidebar-section glass-panel highlight-border">
                 <h4>Emergency Signals</h4>
                 <div className="placeholder-content">NO_CRISIS_DETECTED</div>
               </div>
               <div className="sidebar-section glass-panel" style={{ marginTop: '1rem' }}>
                 <h4>My Delegations</h4>
                 <div className="placeholder-content">LOAD_DELEGATIONS...</div>
               </div>
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
