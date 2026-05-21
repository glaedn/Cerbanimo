import React from 'react';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { ConstellationActivity } from '../components';

const StewardOrbitView = ({ profile, navigate, signals = [] }) => {
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
          <p>Community health is stable. There are 2 pending governance proposals requiring your vote.</p>
          <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <SignalChip label="Proposals" value="2" icon="⚖️" />
            <SignalChip label="Community Health" value="94%" icon="🌱" type="accent" />
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
