import React from 'react';
import FocusCard from '../../../components/shared/FocusCard';
import SignalChip from '../../../components/shared/SignalChip';
import CoordinationSignal from '../../../components/shared/CoordinationSignal';
import { MomentumPanel, ConstellationActivity } from '../components';

const ContributorOrbitView = ({ profile, tasks, navigate, signals = [] }) => {
  const primaryTask = tasks?.length > 0 ? tasks[0] : null;

  return (
    <div className="orbit-view contributor-view">
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
        {primaryTask ? (
          <FocusCard
            title={primaryTask.name}
            kicker="Current Focus"
            status={primaryTask.status.toUpperCase()}
            actions={
              <>
                <button
                  className="orbit-btn primary"
                  onClick={() => navigate(`/missions/visualizer/${primaryTask.projectId}/${primaryTask.id}`)}
                >
                  Execute Mission
                </button>
                <button className="orbit-btn ghost" onClick={() => navigate('/missions')}>View All</button>
              </>
            }
          >
            <p>Current assignment within <strong>{primaryTask.projectName}</strong>. Your skills are a perfect match.</p>
            <div className="focus-stats-row" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
              <SignalChip label="Project" value={primaryTask.projectName} icon="🚀" />
              <SignalChip label="Status" value={primaryTask.status} icon="📡" type="accent" />
            </div>
          </FocusCard>
        ) : (
          <FocusCard
            title="Ready for Mission"
            kicker="Strategic Advisory"
            status="IDLE"
            actions={
              <button className="orbit-btn primary" onClick={() => navigate('/missions')}>Find Work</button>
            }
          >
            <p>You have no current assignments. The Commons has 5 needs matching your expertise.</p>
          </FocusCard>
        )}
      </section>

      <section className="orbit-section momentum">
        <MomentumPanel />
      </section>

      <section className="orbit-section activity">
        <ConstellationActivity />
      </section>
    </div>
  );
};

export default ContributorOrbitView;
