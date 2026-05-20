import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import './CommonsPage.css';

const CommonsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isIndex = location.pathname.replace(/\/$/, '') === '/commons';

  return (
    <div className="commons-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">COMMONS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>{isIndex ? 'Community Exchange' : 'Network Hub'}</h2>
          {isIndex && (
            <div className="signal-group" style={{ display: 'flex', gap: '1rem' }}>
              <SignalChip label="Guilds" value="12" icon="⚒️" />
              <SignalChip label="Members" value="1.2k" icon="👥" />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="commons-index-layout">
            <div className="commons-main">
              <FocusCard
                title="Support Local Skill Sharing"
                kicker="Community Highlight"
                status="NEEDS_PARTICIPATION"
              >
                <p>Join the upcoming "Circular Economics 101" workshop hosted by the Guild of Architects.</p>
              </FocusCard>

              <div className="commons-grid">
                <div className="commons-card glass-panel">
                  <h3>Featured Communities</h3>
                  <div className="placeholder-content">COMMUNITIES_LIST_LOADING...</div>
                </div>
                <div className="commons-card glass-panel">
                  <h3>Marketplace Trends</h3>
                  <div className="placeholder-content">TRENDS_LOADING...</div>
                </div>
              </div>

              <section className="commons-mobile-nav mobile-only">
                <h3>Navigation</h3>
                <div className="mobile-nav-grid">
                  <button onClick={() => navigate('/commons/communities')} className="nav-card">
                    <span className="icon">🏛️</span>
                    <span className="label">Communities</span>
                  </button>
                  <button onClick={() => navigate('/commons/marketplace')} className="nav-card">
                    <span className="icon">🏪</span>
                    <span className="label">Marketplace</span>
                  </button>
                  <button onClick={() => navigate('/commons/needs')} className="nav-card">
                    <span className="icon">🤝</span>
                    <span className="label">Needs</span>
                  </button>
                  <button onClick={() => navigate('/commons/guilds')} className="nav-card">
                    <span className="icon">⚒️</span>
                    <span className="label">Guilds</span>
                  </button>
                </div>
              </section>
            </div>

            <div className="commons-sidebar">
               <div className="sidebar-section glass-panel">
                 <h4>Active Needs</h4>
                 <div className="placeholder-content">NEEDS_FEED...</div>
               </div>
               <div className="sidebar-section glass-panel" style={{ marginTop: '1rem' }}>
                 <h4>Nearby Resources</h4>
                 <div className="placeholder-content">RESOURCES_MAP...</div>
               </div>
            </div>
          </div>
        ) : (
          <div className="commons-sub-content">
            <Outlet />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommonsPage;
