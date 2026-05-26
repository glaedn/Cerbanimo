import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { calculateSignalScore, categorizeSignal } from '../../utils/signalUtils';
import theme from '../../styles/theme';
import { Zap, AlertCircle, Info, Activity } from 'lucide-react';

const RiverContainer = styled.div`
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
`;

const SignalCard = styled(motion.div)`
  pointer-events: auto;
  background: ${props => props.tier === 'critical' ? 'rgba(255, 65, 54, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${props => {
    if (props.tier === 'critical') return theme.tokens.colors.status.urgency.critical;
    if (props.tier === 'active') return theme.tokens.colors.brand.primary;
    return 'rgba(255, 255, 255, 0.15)';
  }};
  border-left: 4px solid ${props => {
    if (props.tier === 'critical') return theme.tokens.colors.status.urgency.critical;
    if (props.tier === 'active') return theme.tokens.colors.brand.primary;
    return theme.tokens.colors.text.muted;
  }};
  padding: 12px;
  border-radius: 8px;
  box-shadow: ${props => props.tier === 'critical' ? theme.tokens.glow.critical : '0 4px 15px rgba(0,0,0,0.2)'};
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const SignalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const TierLabel = styled.span`
  font-size: 0.6rem;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 1px;
  color: ${props => {
    if (props.tier === 'critical') return theme.tokens.colors.status.urgency.critical;
    if (props.tier === 'active') return theme.tokens.colors.brand.primary;
    return theme.tokens.colors.text.muted;
  }};
`;

const SignalTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
`;

const SignalBody = styled.div`
  font-size: 0.75rem;
  color: #ccc;
  margin-top: 2px;
`;

const EventRiver = () => {
  const { realtimeEvents, activeContext } = useAppStore();

  const prioritizedSignals = useMemo(() => {
    return realtimeEvents
      .map(event => {
        // Pass context for better weighting
        const score = calculateSignalScore(event, {
          userRole: 'coordinator', // Could be dynamic
          activeMissions: [] // Could be populated from store
        });
        return { ...event, score, tier: categorizeSignal(score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [realtimeEvents]);

  const getIcon = (tier) => {
    switch (tier) {
      case 'critical': return <AlertCircle size={14} color={theme.tokens.colors.status.urgency.critical} />;
      case 'active': return <Zap size={14} color={theme.tokens.colors.brand.primary} />;
      default: return <Info size={14} color="#888" />;
    }
  };

  return (
    <RiverContainer>
      <AnimatePresence initial={false}>
        {prioritizedSignals.map((signal) => (
          <SignalCard
            key={signal.id}
            tier={signal.tier}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.3 }}
          >
            <SignalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getIcon(signal.tier)}
                <TierLabel tier={signal.tier}>{signal.tier.toUpperCase()}</TierLabel>
              </div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>
                {new Date(signal.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </SignalHeader>
            <SignalTitle>{signal.title || signal.event_type}</SignalTitle>
            <SignalBody>{signal.message || signal.payload?.description || 'Signal detected in ecosystem pulse.'}</SignalBody>
          </SignalCard>
        ))}
      </AnimatePresence>
    </RiverContainer>
  );
};

export default EventRiver;
