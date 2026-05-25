import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FocusCard from '../../components/shared/FocusCard';
import SignalChip from '../../components/shared/SignalChip';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAdaptiveNavigation } from '../../hooks/useAdaptiveNavigation';
import { useGovernanceStore } from '../../store/useGovernanceStore';
import { useCrisis } from '../../context/CrisisContext';
import './SignalsPage.css';

const SignalsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { visibleModes } = useAdaptiveNavigation(profile);
  const { proposals, treaties, fetchCommunityGovernance, fetchFederationAtlas } = useGovernanceStore();
  const { isCrisisMode } = useCrisis();
  const isIndex = location.pathname.replace(/\/$/, '') === '/signals';

  const [impactScore, setImpactScore] = useState(0);
  const [impactTrend, setImpactTrend] = useState(0);

  useEffect(() => {
    if (isIndex && profile?.id) {
      fetchCommunityGovernance(profile.primary_community_id || 1);

      const fetchImpact = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/impact-receipts/community/${profile.primary_community_id || 1}/trend`);
          setImpactScore(res.data.score);
          setImpactTrend(res.data.trend);
        } catch (err) {
          console.error('Error fetching impact score:', err);
        }
      };
      fetchImpact();
      fetchFederationAtlas();
    }
  }, [isIndex, profile?.id, profile?.primary_community_id, fetchCommunityGovernance, fetchFederationAtlas]);

  const activeProposalsCount = useMemo(() =>
    proposals.filter(p => p.status === 'open' || p.status === 'active').length,
  [proposals]);

  const unlockedSystems = profile?.unlockedSystems || {};

  return (
    <div className="signals-page-container mode-page">
      <div className="mode-header">
        <span className="mode-kicker">SIGNALS</span>
        <div className="signals-header-main">
          <h2>{isIndex ? 'Governance & Governance' : 'Signal Details'}</h2>
          {isIndex && (
            <div className="signal-group">
              <SignalChip label="Proposals" value={activeProposalsCount.toString()} icon="⚖️" type="accent" />
              <SignalChip label="Impact Score" value={impactScore.toString()} trend={impactTrend} icon="💎" />
            </div>
          )}
        </div>
      </div>

      <div className="mode-content">
        {isIndex ? (
          <div className="signals-index-layout">
            <div className="signals-main">
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

              {proposals.length > 0 ? (
                <FocusCard
                  title={proposals[0].title}
                  kicker="Active Proposal"
                  status={proposals[0].status.toUpperCase()}
                  actions={
                    <>
                      <button className="orbit-btn primary" onClick={() => navigate(`/signals/governance/${profile?.primary_community_id || 1}`)}>Cast Vote</button>
                      <button className="orbit-btn ghost" onClick={() => navigate(`/signals/governance/${profile?.primary_community_id || 1}`)}>Read Full Proposal</button>
                    </>
                  }
                >
                  <p>{proposals[0].description}</p>
                </FocusCard>
              ) : (
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
              )}

              <div className="signals-grid">
                <div className="signals-card glass-panel">
                  <h3>Major Shifts</h3>
                  <div className="proposals-list">
                    {proposals.slice(0, 3).map(p => (
                      <div key={p.id} className="proposal-item">
                        <p><strong>{p.title}</strong></p>
                        <small>{p.status}</small>
                      </div>
                    ))}
                    {proposals.length === 0 && <p className="placeholder-content">No major shifts detected.</p>}
                  </div>
                </div>
                {unlockedSystems.federation && (
                  <div className="signals-card glass-panel highlight-cyan">
                    <h3>Federation Updates</h3>
                    <div className="treaties-list">
                      {treaties.slice(0, 3).map(t => (
                        <div key={t.id} className="treaty-item">
                          <p>Treaty: {t.type}</p>
                          <small>Status: {t.status}</small>
                        </div>
                      ))}
                      {treaties.length === 0 && <p className="placeholder-content">NET_TRAFFIC_STABLE</p>}
                    </div>
                  </div>
                )}
              </div>

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
                 {isCrisisMode ? (
                   <div className="crisis-alert">
                     <SignalChip label="ACTIVE CRISIS" type="error" />
                     <p>Priority coordination protocols engaged.</p>
                   </div>
                 ) : (
                   <div className="placeholder-content">NO_CRISIS_DETECTED</div>
                 )}
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
