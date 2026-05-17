import React from 'react';
import './ExperienceShell.css';
import { useIsMobile } from '../../hooks/useIsMobile';
import SiteNav from '../../pages/SiteNav';
import MobileBottomNav from '../MobileBottomNav';
import ContextPanel from './ContextPanel';
import ModeRail from './ModeRail';

const ExperienceShell = ({ children, topBar, leftRail, bottomNav, contextPanel }) => {
  const isMobile = useIsMobile();

  return (
    <div className={`experience-shell ${isMobile ? 'mobile' : 'desktop'}`}>
      {!isMobile && (
        <aside className="experience-left-rail">
          {leftRail || <ModeRail />}
        </aside>
      )}

      <div className="experience-content-area">
        {!isMobile && (
          <header className="experience-top-bar">
            {topBar || <SiteNav inShell={true} />}
          </header>
        )}

        <main className="experience-main-viewport">
          <div className="experience-scrolling-container">
            {children}
          </div>

          {!isMobile && (
            <aside className="experience-context-panel">
              {contextPanel || <ContextPanel />}
            </aside>
          )}
        </main>

        {isMobile && (
          <footer className="experience-bottom-nav">
            {bottomNav || <MobileBottomNav />}
          </footer>
        )}
      </div>
    </div>
  );
};

export default ExperienceShell;
