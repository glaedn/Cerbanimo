import React from 'react';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { OpportunityPanel } from '../components';

const ExplorerOrbitView = ({ profile, navigate, signals = [] }) => {
  return (
    <div className="orbit-view explorer-view">
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
          title="Welcome to Cerbanimo"
          kicker="New Arrival"
          status="READY"
          actions={
            <button className="orbit-btn primary" onClick={() => navigate('/commons')}>Explore Communities</button>
          }
        >
          <p>Your journey begins here. Explore the Commons to find a community that aligns with your interests and values.</p>
          <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <SignalChip label="Phase" value="Orientation" icon="✨" />
            <SignalChip label="Discovery" value="High" icon="🔭" type="accent" />
          </div>
        </FocusCard>
      </section>

      <section className="orbit-section opportunities">
        <OpportunityPanel title="Recommended for You" />
      </section>
    </div>
  );
};

export default ExplorerOrbitView;
