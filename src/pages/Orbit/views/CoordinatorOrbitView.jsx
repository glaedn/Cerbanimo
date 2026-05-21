import React from 'react';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { MomentumPanel, ConstellationActivity } from '../components';
import useUserProjects from '../../../hooks/useUserProjects';
import useBlockedProjects from '../../../hooks/useBlockedProjects';

const CoordinatorOrbitView = ({ profile, navigate, signals = [] }) => {
  const { projects } = useUserProjects(profile?.id);
  const { blockedProjects } = useBlockedProjects(profile?.id);

  const projectCount = projects?.length || 0;
  const blockerCount = blockedProjects?.length || 0;
  return (
    <div className="orbit-view coordinator-view">
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
          title="Team Coordination"
          kicker="Command & Control"
          status="ACTIVE"
          actions={
            <>
              <button className="orbit-btn primary" onClick={() => navigate('/orbit/coordinator-hud')}>Open HUD</button>
              <button className="orbit-btn ghost" onClick={() => navigate('/missions')}>Manage Projects</button>
            </>
          }
        >
          <div className="coordinator-badge" style={{
            fontFamily: 'Orbitron',
            fontSize: '0.65rem',
            color: '#5ff0ff',
            marginBottom: '0.5rem',
            border: '1px solid rgba(95, 240, 255, 0.3)',
            padding: '2px 8px',
            display: 'inline-block',
            borderRadius: '4px'
          }}>
            COORDINATOR_MODE_ACTIVE
          </div>
          <p>You are overseeing {projectCount} active projects. {blockerCount > 0 ? `${blockerCount} project${blockerCount > 1 ? 's' : ''} require attention.` : 'All projects are operating within normal parameters.'}</p>
          <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <SignalChip label="Active Projects" value={projectCount.toString()} icon="🏗️" />
            <SignalChip label="Blockers" value={blockerCount.toString()} icon="⚠️" type={blockerCount > 0 ? "accent" : "default"} />
          </div>
        </FocusCard>
      </section>

      <section className="orbit-section activity">
        <ConstellationActivity title="Team Activity" />
      </section>

      <section className="orbit-section momentum">
        <MomentumPanel />
      </section>
    </div>
  );
};

export default CoordinatorOrbitView;
