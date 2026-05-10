import React from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../store/useAppStore';
import theme from '../../styles/theme';
import { motion, AnimatePresence } from 'framer-motion';

const Container = styled.div`
  position: fixed;
  top: 15px;
  right: 20px;
  display: flex;
  flex-direction: row-reverse;
  gap: -8px; /* Overlapping effect */
  z-index: 130;
`;

const AvatarCircle = styled(motion.div)`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid ${theme.tokens.colors.brand.primary};
  background: ${theme.tokens.colors.surface.paper};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  color: #fff;
  cursor: help;
  box-shadow: ${theme.tokens.glow.primary};
  position: relative;

  &:hover .presence-tooltip {
    opacity: 1;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.6rem;
  color: ${theme.tokens.colors.brand.primary};
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  margin-top: 5px;
  border: 1px solid ${theme.tokens.colors.brand.primary};
`;

const PresenceIndicators = () => {
  const { presence } = useAppStore();

  // Aggregate all unique users across all scopes for global presence
  const allActiveUsers = Array.from(new Set(Object.values(presence).flat()));

  if (allActiveUsers.length === 0) return null;

  return (
    <Container>
      <AnimatePresence>
        {allActiveUsers.slice(0, 5).map((userId, index) => (
          <AvatarCircle
            key={userId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{ zIndex: 10 - index }}
            whileHover={{ y: -5, scale: 1.1 }}
          >
            {userId.toString().substring(0, 1).toUpperCase()}
            <Tooltip className="presence-tooltip">
              User ID: {userId} (Active)
            </Tooltip>
          </AvatarCircle>
        ))}
        {allActiveUsers.length > 5 && (
           <AvatarCircle style={{ zIndex: 0, marginLeft: '-10px' }}>
             +{allActiveUsers.length - 5}
           </AvatarCircle>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default PresenceIndicators;
