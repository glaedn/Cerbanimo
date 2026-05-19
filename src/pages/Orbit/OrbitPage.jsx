import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  FocusPanel,
  MomentumPanel,
  ConstellationActivity,
  OpportunityPanel,
  QuickActions,
  OrbitHUD
} from './components';
import './OrbitPage.css';

const OrbitPage = () => {
  const location = useLocation();
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
                <FocusPanel />
              </section>

              <section className="orbit-section momentum">
                <MomentumPanel />
              </section>

              <section className="orbit-section activity">
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
