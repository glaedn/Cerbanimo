import { styled, keyframes } from '@mui/material/styles';

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

export const MirrorContainer = styled('div')(({ isExpanded }) => ({
  position: 'relative',
  cursor: 'pointer',
  width: isExpanded ? '400px' : '100px',
  height: isExpanded ? 'auto' : '120px',
  transition: 'all 0.5s ease',
}));

export const MirrorImageContainer = styled('div')({
  position: 'relative',
  width: '100px',
  height: '120px',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    animation: `${shimmer} 7s linear infinite`,
    background: `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)`,
    backgroundSize: '200% 100%',
  },
});

export const MirrorImage = styled('img')({
  width: '100%',
  height: '100%',
});

export const ActiveMirrorImage = styled('img')({
  width: '400px',
  height: 'auto',
  position: 'absolute',
  top: 0,
  left: 0,
});

export const MirrorContent = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
});

export const MirrorHeader = styled('div')({
  marginBottom: '20px',
});

export const MirrorTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.text.primary,
  textShadow: `0 0 15px ${theme.palette.info.main}`,
}));
