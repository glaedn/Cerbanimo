import React from 'react';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import Tooltip from '@mui/material/Tooltip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { OpportunityPanel } from '../components';

const ExplorerOrbitView = ({ profile, navigate, signals = [] }) => {
  const getNextDecay = () => {
    if (!profile.token_ledger || !Array.isArray(profile.token_ledger)) return null;

    const gracePeriodDays = 90;
    const now = new Date();

    let oldestDate = null;
    for (const entry of profile.token_ledger) {
      const record = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (record.creationDate) {
        const d = new Date(record.creationDate);
        if (!oldestDate || d < oldestDate) oldestDate = d;
      }
    }

    if (!oldestDate) return null;

    const decayDate = new Date(oldestDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
    const diffDays = Math.ceil((decayDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return diffDays > 0 ? diffDays : 0;
  };

  const nextDecayDays = getNextDecay();

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
          <div className="focus-stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
            <SignalChip label="Phase" value="Orientation" icon="✨" />
            <SignalChip label="Discovery" value="High" icon="🔭" type="accent" />

            {nextDecayDays !== null && (
              <Tooltip title="Tokens are stable for 90 days. Monthly 1% circulation incentive applies after.">
                <span>
                  <SignalChip
                    label="Next Decay"
                    value={`${nextDecayDays} days`}
                    icon="⏳"
                    type="warning"
                  />
                </span>
              </Tooltip>
            )}

            {profile.total_decayed > 0 && (
              <Tooltip title="Total cotokens contributed to the circulation incentive ecosystem.">
                <span>
                  <SignalChip
                    label="Decayed Lifetime"
                    value={`${Number(profile.total_decayed).toFixed(2)} Ȼ`}
                    icon="🌀"
                  />
                </span>
              </Tooltip>
            )}
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
