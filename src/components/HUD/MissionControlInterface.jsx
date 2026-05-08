import React from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../store/useAppStore';
import { Target, Users, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import theme from '../../styles/theme';

const Container = styled.div`
  width: 340px;
  background: rgba(10, 10, 46, 0.85);
  border: 1px solid ${theme.tokens.colors.brand.primary};
  border-radius: 8px;
  backdrop-filter: blur(12px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: ${theme.tokens.glow.primary};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 243, 255, 0.2);
  padding-bottom: 8px;
`;

const Title = styled.h3`
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  color: ${theme.tokens.colors.brand.primary};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.span`
  font-size: 0.65rem;
  color: ${theme.tokens.colors.text.muted};
  text-transform: uppercase;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.span`
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
`;

const MissionControlInterface = () => {
  const selectedEntity = useAppStore(state => state.selectedEntity);
  const entities = useAppStore(state => state.entities);

  const mission = selectedEntity?.type === 'project' ? selectedEntity : null;
  const tasks = Object.values(entities).filter(e => e.type === 'task' && e.raw?.project_id === mission?.id);
  const blockers = tasks.filter(t => (t.status || '').toLowerCase() === 'blocked');

  if (!mission) {
    return (
      <Container>
        <Title>Mission Control</Title>
        <p style={{ fontSize: '0.8rem', color: '#888' }}>Select a project or task to initialize mission control operational context.</p>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Mission: {mission.name}</Title>
        <Target size={18} color={theme.tokens.colors.brand.primary} />
      </Header>

      <StatGrid>
        <StatItem>
          <Label>Velocity</Label>
          <StatValue>84%</StatValue>
        </StatItem>
        <StatItem>
          <Label>Contributors</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} color={theme.tokens.colors.brand.primary} />
            <StatValue>12</StatValue>
          </div>
        </StatItem>
      </StatGrid>

      <Section>
        <Label>Critical Path & Blockers</Label>
        {blockers.length > 0 ? blockers.map(b => (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 65, 54, 0.1)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255, 65, 54, 0.3)' }}>
            <AlertTriangle size={14} color={theme.tokens.colors.status.urgency.critical} />
            <span style={{ fontSize: '0.75rem', color: '#fff' }}>{b.name}</span>
          </div>
        )) : (
          <span style={{ fontSize: '0.75rem', color: theme.tokens.colors.status.urgency.low }}>No active blockers detected.</span>
        )}
      </Section>

      <Section>
        <Label>Logistics Flow</Label>
        <div style={{ fontSize: '0.75rem', color: '#ccc', display: 'flex', justifyContent: 'space-between' }}>
          <span>Resources Allocated</span>
          <span style={{ color: theme.tokens.colors.brand.primary }}>92%</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: '92%', height: '100%', background: theme.tokens.colors.brand.primary }}></div>
        </div>
      </Section>

      <button style={{
        marginTop: '8px',
        background: theme.tokens.colors.brand.primary,
        border: 'none',
        borderRadius: '4px',
        padding: '8px',
        color: '#000',
        fontFamily: 'Orbitron',
        fontSize: '0.7rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}>
        EXECUTE COORDINATION <ChevronRight size={14} />
      </button>
    </Container>
  );
};

export default MissionControlInterface;
