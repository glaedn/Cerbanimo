import { styled, keyframes } from '@mui/material/styles';

const twinkle = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
`;

export const AffinityWebContainer = styled('div')(({ isExpanded }) => ({
  position: 'relative',
  cursor: 'pointer',
  width: isExpanded ? '450px' : '120px',
  height: isExpanded ? 'auto' : '120px',
  transition: 'all 0.5s ease',
}));

export const OrbImage = styled('img')({
  width: '120px',
  height: '120px',
  animation: `${twinkle} 3s infinite ease-in-out`,
});

export const AffinityWebWrapper = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  clipPath: 'circle(50% at 50% 50%)',
});

export const ActiveOrbImage = styled('img')({
  width: '450px',
  height: 'auto',
});

export const AffinityWebHeader = styled('div')({
  marginBottom: '20px',
});

export const AffinityWebTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.text.primary,
  textShadow: `0 0 12px ${theme.palette.info.main}`,
}));
