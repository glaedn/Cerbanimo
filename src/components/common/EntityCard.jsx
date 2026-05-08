import React from 'react';
import styled from '@emotion/styled';
import theme from '../../styles/theme';

const CardContainer = styled.div`
  background: ${theme.tokens.colors.surface.paper};
  border: 1px solid ${props => props.borderColor || theme.tokens.colors.brand.primary};
  border-radius: 8px;
  padding: ${theme.tokens.spacing.md};
  box-shadow: ${props => props.glow ? (props.glowColor || theme.tokens.glow.primary) : 'none'};
  transition: ${theme.tokens.motion.standard};
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.glowColor || theme.tokens.glow.primary};
  }
`;

const EntityHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.tokens.spacing.sm};
`;

const EntityTitle = styled.h3`
  margin: 0;
  color: ${theme.tokens.colors.text.primary};
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
`;

const EntityCard = ({ entity, onClick, children, ...props }) => {
  return (
    <CardContainer onClick={onClick} {...props}>
      <EntityHeader>
        <EntityTitle>{entity.title || entity.name}</EntityTitle>
        {entity.status && <span>{entity.status}</span>}
      </EntityHeader>
      {children}
    </CardContainer>
  );
};

export default EntityCard;
