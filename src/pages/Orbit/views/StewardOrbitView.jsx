import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { ConstellationActivity } from '../components';
import { useGovernanceStore } from '../../../store/useGovernanceStore';

const StewardOrbitView = ({ profile, navigate, signals = [] }) => {
  const { proposals, fetchCommunityGovernance } = useGovernanceStore();
  const [communityHealth, setCommunityHealth] = useState('94%');

  useEffect(() => {
    if (profile?.primary_community_id) {
      fetchCommunityGovernance(profile.primary_community_id);

      const fetchHealth = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${profile.primary_community_id}`);
          if (res.data.health_score) {
            setCommunityHealth(Math.round(res.data.health_score * 100) + '%');
          }
        } catch (err) {
          console.error('Error fetching community health:', err);
        }
      };
      fetchHealth();
    }
  }, [profile?.primary_community_id, fetchCommunityGovernance]);

  const pendingProposalsCount = useMemo(() =>
    proposals.filter(p => p.status === 'open' || p.status === 'active').length,
  [proposals]);

  return (
    <div className="orbit-view steward-view">
      {signals.length > 0 && (
        <section className="orbit-section intelligence-signals">
          {signals.map((signal, idx) => (
            <CoordinationSignal
              key={idx}
              signal={signal}
              onAction={(path) => navigate(path)}
            />
          ))}
        </section>
      )}
      <section className="orbit-section focus">
        <FocusCard
          title="System Governance"
          kicker="Stewardship"
          status="OVERSIGHT"
          actions={
            <>
              <button className="orbit-btn primary" onClick={() => navigate('/signals/governance')}>Review Proposals</button>
              <button className="orbit-btn ghost" onClick={() => navigate('/signals')}>View Signals</button>
            </>
          }
        >
          <p>Community health is stable. There are {pendingProposalsCount} pending governance proposals requiring your vote.</p>
          <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <SignalChip label="Proposals" value={pendingProposalsCount.toString()} icon="⚖️" />
            <SignalChip label="Community Health" value={communityHealth} icon="🌱" type="accent" />
          </div>
        </FocusCard>
      </section>

      <section className="orbit-section activity">
        <ConstellationActivity title="Governance Stream" />
      </section>
    </div>
  );
};

export default StewardOrbitView;
