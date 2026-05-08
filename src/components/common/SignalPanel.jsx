import React from 'react';
import styled from '@emotion/styled';
import theme from '../../styles/theme';

const PanelContainer = styled.div`
  background: ${theme.tokens.colors.surface.background};
  border-left: 2px solid ${theme.tokens.colors.brand.primary};
  padding: ${theme.tokens.spacing.md};
  margin: ${theme.tokens.spacing.sm} 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${theme.tokens.colors.brand.primary};
    box-shadow: ${theme.tokens.glow.primary};
  }
`;

const SignalLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: ${theme.tokens.colors.brand.primary};
  letter-spacing: 1px;
  margin-bottom: ${theme.tokens.spacing.xs};
`;

const SignalPanel = ({ label, children }) => {
  return (
    <PanelContainer>
      {label && <SignalLabel>{label}</SignalLabel>}
      {children}
    </PanelContainer>
  );
};

export default SignalPanel;
