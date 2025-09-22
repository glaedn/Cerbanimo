import { styled, keyframes } from '@mui/material/styles';

const glow = keyframes`
  0% {
    box-shadow: 0 0 5px ${({ theme }) => theme.palette.secondary.main};
  }
  50% {
    box-shadow: 0 0 20px ${({ theme }) => theme.palette.secondary.main}, 0 0 25px ${({ theme }) => theme.palette.secondary.main};
  }
  100% {
    box-shadow: 0 0 5px ${({ theme }) => theme.palette.secondary.main};
  }
`;

export const JournalContainer = styled('div')(({ isExpanded }) => ({
  position: 'relative',
  cursor: 'pointer',
  width: isExpanded ? '350px' : '100px',
  height: isExpanded ? 'auto' : '120px',
  transition: 'all 0.5s ease',
}));

export const JournalImage = styled('img')(({ hasNew }) => ({
  width: '100px',
  height: '120px',
  animation: hasNew ? `${glow} 1.5s infinite` : 'none',
}));

export const ActiveJournalImage = styled('img')({
  width: '350px',
  height: 'auto',
  position: 'absolute',
  top: 0,
  left: 0,
});

export const JournalContent = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
  padding: '20px',
});

export const JournalHeader = styled('div')({
  marginBottom: '15px',
});

export const JournalTitle = styled('h2')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyScript,
  color: theme.palette.text.primary,
  textShadow: `0 0 8px ${theme.palette.secondary.main}`,
}));
