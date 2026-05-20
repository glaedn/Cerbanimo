import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
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
  // Resilient index detection that ignores trailing slashes and search params
  const isIndex = location.pathname.replace(/\/$/, '') === '/orbit';

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
                <FocusCard
                  title="Optimize Community Wealth"
                  kicker="Primary Objective"
                  status="IN_PROGRESS"
                  actions={
                    <>
                      <button className="orbit-btn primary" onClick={() => navigate('/missions')}>Execute Mission</button>
                      <button className="orbit-btn ghost">View Details</button>
                    </>
                  }
                >
                  <p>Current focus: Facilitating the transition to local resource circularity in the Sector 7 community.</p>
                  <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                    <SignalChip label="Progress" value="68%" trend={12} icon="📈" />
                    <SignalChip label="Alignment" value="High" icon="🎯" type="accent" />
                  </div>
                </FocusCard>
              </section>

              <section className="orbit-section momentum">
                <div className="section-header">
                  <h3>Momentum</h3>
                  <div className="signal-row">
                    <SignalChip label="Daily XP" value="+1,240" trend={5} />
                    <SignalChip label="Streak" value="12 Days" icon="🔥" />
                  </div>
                </div>
                <MomentumPanel />
              </section>

              <section className="orbit-section activity">
                <h3>Constellation Activity</h3>
                <ConstellationActivity />
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
