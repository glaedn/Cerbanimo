import React from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAdaptiveNavigation } from '../../hooks/useAdaptiveNavigation';
import './SignalsPage.css';

const SignalsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { visibleModes } = useAdaptiveNavigation(profile);
  const isIndex = location.pathname.replace(/\/$/, '') === '/signals';

  const unlockedSystems = profile?.unlockedSystems || {};

  return (
    <div className="signals-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">SIGNALS</span>
        <div className="signals-header-main">
          <h2>{isIndex ? 'Governance & Governance' : 'Signal Details'}</h2>
          {isIndex && (
            <div className="signal-group">
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
                {unlockedSystems.federation && (
                  <div className="signals-card glass-panel highlight-cyan">
                    <h3>Federation Updates</h3>
                    <div className="placeholder-content">NET_TRAFFIC_STABLE</div>
                  </div>
                )}
              </div>

              <section className="signals-mobile-nav mobile-only">
                <h3>Navigation</h3>
                <div className="mobile-nav-grid">
                  <button onClick={() => navigate(`/signals/governance/${profile?.primary_community_id || 1}`)} className="nav-card">
                    <span className="icon">⚖️</span>
                    <span className="label">Governance</span>
                  </button>
                  <button onClick={() => navigate('/signals/impact')} className="nav-card">
                    <span className="icon">💎</span>
                    <span className="label">Impact</span>
                  </button>
                  <button onClick={() => navigate('/signals/activity-map')} className="nav-card">
                    <span className="icon">🗺️</span>
                    <span className="label">Map</span>
                  </button>
                  {unlockedSystems.federation && (
                    <button onClick={() => navigate('/signals/federation')} className="nav-card">
                      <span className="icon">🌐</span>
                      <span className="label">Federation</span>
                    </button>
                  )}
                </div>
              </section>
            </div>

            <div className="signals-sidebar">
               <div className="governance-access-panel glass-panel highlight-border">
                 <h4>Governance Systems</h4>
                 <p className="panel-hint">Advanced administrative controls and coordination protocols.</p>
                 <Link to={`/signals/governance/${profile?.primary_community_id || 1}`} className="signals-btn">
                   Open Full Governance View
                 </Link>
               </div>

               <div className="sidebar-section glass-panel emergency-signals">
                 <h4>Emergency Signals</h4>
                 <div className="placeholder-content">NO_CRISIS_DETECTED</div>
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
