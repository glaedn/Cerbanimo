import { styled, keyframes } from '@mui/material/styles';

const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 10px ${({ theme }) => theme.palette.primary.main};
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 20px ${({ theme }) => theme.palette.primary.main}, 0 0 30px ${({ theme }) => theme.palette.primary.main};
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 10px ${({ theme }) => theme.palette.primary.main};
  }
`;

export const PanelContainer = styled('div')(({ theme, isExpanded }) => ({
  position: 'relative',
  cursor: 'pointer',
  width: isExpanded ? '400px' : '100px',
  height: isExpanded ? 'auto' : '100px',
  transition: 'all 0.5s ease',
}));

export const ShrineImage = styled('img')(({ isExpanded }) => ({
  width: '100px',
  height: '100px',
  opacity: isExpanded ? 0 : 1,
  animation: `${pulse} 2s infinite`,
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 1,
}));

export const ActiveShrineImage = styled('img')({
  width: '400px',
  height: '400px',
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 2,
});

export const PanelContent = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
});

export const PanelHeader = styled('div')({
  marginBottom: '20px',
});

export const PanelTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.text.primary,
  textShadow: theme.effects.textShadow,
}));
