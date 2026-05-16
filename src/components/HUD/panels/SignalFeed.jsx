import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../../store/useAppStore';
import SignalPanel from '../../common/SignalPanel';
import theme from '../../../styles/theme';
import { AlertTriangle, Zap, Info, MapPin } from 'lucide-react';

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.tokens.spacing.sm};
  max-height: 300px;
  overflow-y: auto;
  padding: ${theme.tokens.spacing.xs};

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${theme.tokens.colors.brand.primary};
    border-radius: 2px;
  }
`;

const SignalItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  &:hover { opacity: 0.8; }
`;

const SignalText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: ${theme.tokens.colors.text.primary};
`;

const SignalMeta = styled.span`
  font-size: 0.7rem;
  color: ${theme.tokens.colors.text.muted};
  font-family: ${theme.typography.fontFamilyAccent};
`;

const SignalFeed = () => {
  const entities = useAppStore(state => state.entities);
  const selectEntity = useAppStore(state => state.selectEntity);

  // Heuristic-based Signal Generation (Internal for now, could be moved to store/hook)
  const signals = useMemo(() => {
    const sigs = [];
    const allEntities = Object.values(entities);

    // 1. Blocked Tasks Signal
    const blockedTasks = allEntities.filter(e => e.type === 'task' && (e.status || '').toLowerCase().includes('blocked'));
    blockedTasks.forEach(task => {
      sigs.push({
        id: `sig-blocked-${task.id}`,
        type: 'operational',
        label: 'BLOCKAGE DETECTED',
        text: `Task "${task.name}" is currently blocked.`,
        icon: <AlertTriangle size={14} color={theme.tokens.colors.status.urgency.critical} />,
        entity: task
      });
    });

    // 2. High Urgency Needs
    const urgentNeeds = allEntities.filter(e => e.type === 'need' && /(urgent|critical)/i.test(e.status));
    urgentNeeds.forEach(need => {
      sigs.push({
        id: `sig-urgent-${need.id}`,
        type: 'operational',
        label: 'URGENCY SPIKE',
        text: `High priority need: "${need.name}" requires attention.`,
        icon: <Zap size={14} color={theme.tokens.colors.status.urgency.high} />,
        entity: need
      });
    });

    // 3. Nearby Activity (Mocking spatial for now)
    const recentActivity = allEntities
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 3);

    recentActivity.forEach(item => {
      sigs.push({
        id: `sig-recent-${item.id}`,
        type: 'spatial',
        label: 'REGIONAL SIGNAL',
        text: `New activity detected: "${item.name}"`,
        icon: <MapPin size={14} color={theme.tokens.colors.brand.primary} />,
        entity: item
      });
    });

    return sigs.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 10);
  }, [entities]);

  return (
    <FeedContainer>
      {signals.length > 0 ? signals.map(sig => (
        <SignalPanel key={sig.id} label={sig.label}>
          <SignalItem onClick={() => selectEntity(sig.entity)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sig.icon}
              <SignalText>{sig.text}</SignalText>
            </div>
            <SignalMeta>{sig.type.toUpperCase()}</SignalMeta>
          </SignalItem>
        </SignalPanel>
      )) : (
        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: theme.tokens.colors.text.muted, textAlign: 'center' }}>
          Scanning for ecosystem signals...
        </p>
      )}
    </FeedContainer>
  );
};

export default SignalFeed;
