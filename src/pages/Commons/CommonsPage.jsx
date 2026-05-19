import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CommunityPulse, FeaturedCommunities, RecentExchange } from './components';
import './CommonsPage.css';

const CommonsPage = () => {
  const location = useLocation();
  const isIndex = location.pathname.replace(/\/$/, '') === '/commons';

  return (
    <div className="commons-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">COMMONS</span>
        <h2>{isIndex ? 'Ecosystem Overview' : 'Community Details'}</h2>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="commons-index-layout">
            <div className="commons-main">
              <CommunityPulse />
              <FeaturedCommunities />
            </div>
            <div className="commons-sidebar">
              <RecentExchange />
              <div className="commons-discovery-panel">
                <h4>Discovery</h4>
                <button className="commons-btn">Browse All Guilds</button>
                <button className="commons-btn">Open Marketplace</button>
                <button className="commons-btn">Find Nearby Needs</button>
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
