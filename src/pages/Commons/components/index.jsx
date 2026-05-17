import React from 'react';
import { FocusCard, SignalChip } from '../../../components/shared/Primitives';
import './CommonsComponents.css';

export const CommunityPulse = () => {
  return (
    <div className="community-pulse">
      <div className="orbit-section-header">
        <span className="orbit-kicker">COMMUNAL_AWARENESS</span>
        <h3>Commons Pulse</h3>
      </div>
      <div className="pulse-grid">
        <div className="pulse-card commons">
          <span className="pulse-label">ACTIVE_GUILDS</span>
          <span className="pulse-value">12</span>
        </div>
        <div className="pulse-card commons">
          <span className="pulse-label">MARKET_VOLUME</span>
          <span className="pulse-value">2.4k</span>
        </div>
        <div className="pulse-card commons">
          <span className="pulse-label">OPEN_NEEDS</span>
          <span className="pulse-value">45</span>
        </div>
      </div>
    </div>
  );
};

export const FeaturedCommunities = () => {
  const communities = [
    { id: 1, name: 'Greenwood Commons', type: 'Ecological', description: 'Local regenerative agriculture network.' },
    { id: 2, name: 'Nexus Guild', type: 'Technical', description: 'Shared infrastructure and API coordination.' },
  ];

  return (
    <div className="featured-communities">
      <div className="orbit-section-header">
        <span className="orbit-kicker">DISCOVER_BELONGING</span>
        <h3>Featured Communities</h3>
      </div>
      <div className="communities-row">
        {communities.map(comm => (
          <FocusCard
            key={comm.id}
            title={comm.name}
            description={comm.description}
            actionLabel="Enter Community"
            onAction={() => console.log('Enter Community', comm.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const RecentExchange = () => {
  return (
    <div className="recent-exchange">
      <div className="orbit-section-header">
        <span className="orbit-kicker">MUTUAL_AID_STREAM</span>
        <h3>Recent Exchange</h3>
      </div>
      <div className="exchange-list">
        <div className="exchange-item">
          <SignalChip label="Resource" type="success" />
          <p>Shared 'Solar Array 4' with Sector 9.</p>
        </div>
        <div className="exchange-item">
          <SignalChip label="Need" type="info" />
          <p>Skill 'Rust' requested by Nexus Guild.</p>
        </div>
      </div>
    </div>
  );
};
