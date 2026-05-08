import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../store/useAppStore';
import theme from '../../styles/theme';
import { motion } from 'framer-motion';

const Container = styled.div`
  position: fixed;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  z-index: 120;
  pointer-events: none;
`;

const PulseIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 0.55rem;
  font-family: 'Orbitron', sans-serif;
  color: ${theme.tokens.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const BarContainer = styled.div`
  width: 60px;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
`;

const BarFill = styled(motion.div)`
  height: 100%;
  background: ${props => props.color || theme.tokens.colors.brand.primary};
`;

const CoordinationPulseHUD = () => {
  const { entities, realtimeEvents } = useAppStore();

  const stats = useMemo(() => {
    const allEntities = Object.values(entities);
    const missions = allEntities.filter(e => e.type === 'project').length;
    const needs = allEntities.filter(e => e.type === 'need').length;
    const recentActivity = realtimeEvents.length;

    return {
      operational: Math.min((missions / 20) * 100, 100),
      social: Math.min((needs / 30) * 100, 100),
      momentum: Math.min((recentActivity / 10) * 100, 100)
    };
  }, [entities, realtimeEvents]);

  return (
    <Container>
      <PulseIndicator>
        <Label>Operational</Label>
        <BarContainer>
          <BarFill
            animate={{ width: `${stats.operational}%` }}
            color={theme.tokens.colors.brand.primary}
          />
        </BarContainer>
      </PulseIndicator>

      <PulseIndicator>
        <Label>Social Pulse</Label>
        <BarContainer>
          <BarFill
            animate={{ width: `${stats.social}%` }}
            color={theme.tokens.colors.brand.secondary}
          />
        </BarContainer>
      </PulseIndicator>

      <PulseIndicator>
        <Label>Momentum</Label>
        <BarContainer>
          <BarFill
            animate={{ width: `${stats.momentum}%` }}
            color={theme.tokens.colors.brand.accent}
          />
        </BarContainer>
      </PulseIndicator>

      {/* Central Beat Icon */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: theme.tokens.colors.brand.primary,
          boxShadow: theme.tokens.glow.primary
        }}
      />
    </Container>
  );
};

export default CoordinationPulseHUD;
