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
  width: isExpanded ? '600px' : '100px', // Expanded by 50%
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
  width: '600px', // Expanded by 50%
  height: 'auto',
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 2,
});
export const ExpandedContent = styled('div')(({ isExpanded }) => ({
  opacity: isExpanded ? 1 : 0,
  transition: 'opacity 0.5s ease 0.3s',
  position: 'relative',
  zIndex: 3,
}));
export const PanelContent = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
  height: '80%',
  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  zIndex: 3,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
});

export const PanelHeader = styled('div')({
  marginBottom: '20px',
});

export const PanelTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.text.primary,
  textShadow: theme.effects?.textShadow,
}));
