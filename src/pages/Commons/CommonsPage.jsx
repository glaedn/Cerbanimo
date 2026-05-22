import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import './CommonsPage.css';

const CommonsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isIndex = location.pathname.replace(/\/$/, '') === '/commons';

  const [stats, setStats] = useState({ guilds: 0, members: 0 });
  const [featuredCommunities, setFeaturedCommunities] = useState([]);
  const [activeNeeds, setActiveNeeds] = useState([]);
  const [marketplaceActivity, setMarketplaceActivity] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommonsData = async () => {
      setLoading(true);
      try {
        const [commRes, guildRes, needsRes, activityRes, resourceRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities?pageSize=5`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/guilds_v2`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/needs?status=open&limit=5`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/marketplace/activity`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/resources/catalog`)
        ]);

        setStats({
          members: commRes.data.totalMembers ? commRes.data.totalMembers.toLocaleString() : '0',
          guilds: guildRes.data.length
        });
        setFeaturedCommunities(commRes.data.communities || []);
        setActiveNeeds(needsRes.data.slice(0, 5));
        setMarketplaceActivity(activityRes.data.slice(0, 5));
        setResources(resourceRes.data.slice(0, 5));

      } catch (err) {
        console.error('Error fetching commons data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isIndex) fetchCommonsData();
  }, [isIndex]);

  return (
    <div className="commons-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">COMMONS</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>{isIndex ? 'Community Exchange' : 'Network Hub'}</h2>
          {isIndex && (
            <div className="signal-group" style={{ display: 'flex', gap: '1rem' }}>
              <SignalChip label="Guilds" value={stats.guilds.toString()} icon="⚒️" />
              <SignalChip label="Members" value={stats.members.toString()} icon="👥" />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="commons-index-layout">
            <div className="commons-main">
              {activeNeeds.length > 0 ? (
                <FocusCard
                  title={activeNeeds[0].name}
                  kicker="Active Need"
                  status={activeNeeds[0].urgency.toUpperCase()}
                  actionLabel="Offer Help"
                  onAction={() => navigate(`/commons/needs/${activeNeeds[0].id}`)}
                >
                  <p>{activeNeeds[0].description}</p>
                </FocusCard>
              ) : (
                <FocusCard
                  title="Support Local Skill Sharing"
                  kicker="Community Highlight"
                  status="NEEDS_PARTICIPATION"
                >
                  <p>Join the upcoming "Circular Economics 101" workshop hosted by the Guild of Architects.</p>
                </FocusCard>
              )}

              <div className="commons-grid">
                <div className="commons-card glass-panel">
                  <h3>Featured Communities</h3>
                  <div className="featured-communities-list">
                    {featuredCommunities.map(c => (
                      <div key={c.id} className="community-item">
                        <Link to={`/commons/community/${c.id}`}>{c.name}</Link>
                        <p>{c.members?.length || 0} members</p>
                      </div>
                    ))}
                    {featuredCommunities.length === 0 && <p className="placeholder-content">No communities found.</p>}
                  </div>
                </div>
                <div className="commons-card glass-panel">
                  <h3>Marketplace Activity</h3>
                  <div className="marketplace-activity-list">
                    {marketplaceActivity.map((a, i) => (
                      <div key={i} className="activity-item">
                        <span className="activity-type">{a.activity_type.replace('_', ' ')}</span>
                        <p>{a.title}</p>
                      </div>
                    ))}
                    {marketplaceActivity.length === 0 && <p className="placeholder-content">No recent activity.</p>}
                  </div>
                </div>
              </div>

              <section className="commons-mobile-nav mobile-only">
                <h3>Navigation</h3>
                <div className="mobile-nav-grid">
                  <button onClick={() => navigate('/commons/communities')} className="nav-card">
                    <span className="icon">🏛️</span>
                    <span className="label">Communities</span>
                  </button>
                  <button onClick={() => navigate('/commons/marketplace/discover')} className="nav-card">
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
                 <div className="needs-feed">
                   {activeNeeds.map(n => (
                     <div key={n.id} className="need-feed-item">
                       <Link to={`/commons/needs/${n.id}`}><strong>{n.name}</strong></Link>
                       <p>{n.urgency}</p>
                     </div>
                   ))}
                   {activeNeeds.length === 0 && <p className="placeholder-content">No active needs.</p>}
                 </div>
               </div>
               <div className="sidebar-section glass-panel" style={{ marginTop: '1rem' }}>
                 <h4>Recent Resources</h4>
                 <div className="resources-list">
                   {resources.map(r => (
                     <div key={r.id} className="resource-item">
                       <p><strong>{r.name}</strong> - {r.category}</p>
                     </div>
                   ))}
                   {resources.length === 0 && <p className="placeholder-content">No resources listed.</p>}
                 </div>
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
