import { styled, keyframes } from '@mui/material/styles';

const sparkle = keyframes`
  0%, 100% {
    box-shadow: 0 0 5px #FFD700, 0 0 10px #FFD700, 0 0 15px #FFFFFF;
    opacity: 0.8;
  }
  50% {
    box-shadow: 0 0 15px #FFD700, 0 0 25px #FFD700, 0 0 35px #FFFFFF;
    opacity: 1;
  }
`;

export const QuestsContainer = styled('div')(({ isExpanded }) => ({
  position: 'relative',
  cursor: 'pointer',
  width: isExpanded ? '380px' : '100px',
  height: isExpanded ? 'auto' : '100px',
  transition: 'all 0.5s ease',
}));

export const ScrollImage = styled('img')({
  width: '100px',
  height: '100px',
  animation: `${sparkle} 2.5s infinite`,
});

export const ActiveScrollImage = styled('img')({
  width: '380px',
  height: 'auto',
  position: 'absolute',
  top: 0,
  left: 0,
});

export const QuestsContent = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
});

export const QuestsHeader = styled('div')({
  marginBottom: '20px',
});

export const QuestsTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.text.primary,
  textShadow: `0 0 10px ${theme.palette.warning.main}`,
}));
