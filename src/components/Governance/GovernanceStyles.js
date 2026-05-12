import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import theme from '../../styles/theme';

export const PageContainer = styled.div`
  background-color: #050510;
  height: calc(100vh - 50px);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  padding: 2rem;
  box-sizing: border-box;
  overflow: hidden;
`;

export const Header = styled.header`
  margin-bottom: 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Title = styled.h1`
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #fff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);

  svg {
    color: ${theme.tokens.colors.brand.primary};
    filter: drop-shadow(0 0 10px ${theme.tokens.colors.brand.primary});
  }

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

export const Subtitle = styled.p`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #666;
  margin: 0;
`;

export const GlassPanel = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
  height: 100%;
  box-sizing: border-box;
  transition: border-color 0.3s ease;

  &:hover {
    border-color: rgba(0, 243, 255, 0.3);
  }
`;

export const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

export const GridItem = styled.div`
  grid-column: span ${props => props.span || 12};

  @media (max-width: 1200px) {
    grid-column: span 1;
  }
`;

export const SectionLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #444;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-left: 2px solid ${theme.tokens.colors.brand.primary};
  padding-left: 0.75rem;
`;

export const NeonButton = styled.button`
  background: ${props => {
    if (props.variant === 'outline') return 'transparent';
    if (props.color === 'red') return theme.tokens.colors.status.urgency.critical;
    return '#0891b2';
  }};
  color: ${props => props.variant === 'outline' ? (props.color === 'red' ? theme.tokens.colors.status.urgency.critical : theme.tokens.colors.brand.primary) : 'white'};
  border: ${props => {
    if (props.active) return `2px solid ${props.color === 'red' ? '#fff' : theme.tokens.colors.brand.primary}`;
    return props.variant === 'outline' ? `1px solid ${props.color === 'red' ? theme.tokens.colors.status.urgency.critical : 'rgba(0, 243, 255, 0.3)'}` : 'none';
  }};
  padding: ${props => props.size === 'compact' ? '0.5rem 1rem' : '0.75rem 1.5rem'};
  border-radius: 0.75rem;
  font-family: 'Orbitron', sans-serif;
  font-size: ${props => props.size === 'compact' ? '0.6rem' : '0.7rem'};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: ${props => {
    if (props.active) {
       const glowColor = props.color === 'red' ? theme.tokens.colors.status.urgency.critical : theme.tokens.colors.brand.primary;
       return `0 0 25px ${glowColor}`;
    }
    if (props.variant === 'outline') return 'none';
    const glowColor = props.color === 'red' ? theme.tokens.colors.status.urgency.critical : 'rgba(8, 145, 178, 0.3)';
    return `0 0 20px ${glowColor}`;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: ${props => {
      if (props.variant === 'outline') return props.color === 'red' ? 'rgba(255, 65, 54, 0.1)' : 'rgba(0, 243, 255, 0.1)';
      return props.color === 'red' ? '#cc332a' : '#06b6d4';
    }};
    box-shadow: ${props => {
      if (props.active) {
        const glowColor = props.color === 'red' ? theme.tokens.colors.status.urgency.critical : theme.tokens.colors.brand.primary;
        return `0 0 35px ${glowColor}`;
      }
      if (props.variant === 'outline') return `0 0 15px ${props.color === 'red' ? theme.tokens.colors.status.urgency.critical : 'rgba(0, 243, 255, 0.2)'}`;
      const glowColor = props.color === 'red' ? theme.tokens.colors.status.urgency.critical : 'rgba(8, 145, 178, 0.5)';
      return `0 0 30px ${glowColor}`;
    }};
    transform: scale(1.02);
    border-color: ${props => props.color === 'red' ? theme.tokens.colors.status.urgency.critical : theme.tokens.colors.brand.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

export const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

export const DataRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.5rem;
  width: 100%;
`;

export const DataLabel = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const DataValue = styled.span`
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
  color: #22d3ee;
  text-transform: uppercase;
`;

export const ProgressBar = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.color || theme.tokens.colors.brand.primary};
  width: ${props => props.percent || 0}%;
  box-shadow: 0 0 10px ${props => props.color || theme.tokens.colors.brand.primary};
  transition: width 1s ease-in-out;
`;

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

export const ModalContent = styled(GlassPanel)`
  width: 100%;
  max-width: 600px;
  background: #0a0a1a;
  border-color: rgba(0, 243, 255, 0.3);
  padding: 2.5rem;
`;

export const FormField = styled.div`
  margin-bottom: 1.5rem;
`;

export const Label = styled.label`
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 0.5rem;
`;

export const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: white;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;

  &:focus {
    border-color: ${theme.tokens.colors.brand.primary};
    background: rgba(255, 255, 255, 0.05);
    outline: none;
    box-shadow: 0 0 10px rgba(0, 243, 255, 0.1);
  }
`;

export const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: white;
  appearance: none;
`;

export const TextArea = styled.textarea`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: white;
  font-family: 'Inter', sans-serif;
  min-height: 120px;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  width: 100%;
  align-items: center;
  justify-content: center;
`;
