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
  width: isExpanded ? '525px' : '100px', // Expanded by ~50%
  height: isExpanded ? 'auto' : '120px',
  transition: 'all 0.5s ease',
  bottom: isExpanded ? '50px' : '0', // Shift upward when expanded
}));

export const JournalImage = styled('img')(({ hasNew }) => ({
  width: '100px',
  height: '120px',
  animation: hasNew ? `${glow} 1.5s infinite` : 'none',
}));

export const ActiveJournalImage = styled('img')({
  width: '525px', // Expanded by ~50%
  height: 'auto',
  position: 'absolute',
  top: 0,
  left: 0,
});

export const JournalContent = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  width: '80%',
  padding: '20px',
  color: '#4b0082', // Deep purple
  fontFamily: '"Garamond", "Georgia", "Times New Roman", serif', // Script-style font
  fontSize: '1.1rem',
  clipPath: 'polygon(10% 5%, 90% 5%, 95% 50%, 90% 95%, 10% 95%, 5% 50%)',
}));

export const JournalHeader = styled('div')({
  marginBottom: '15px',
});

export const JournalTitle = styled('h2')(({ theme }) => ({
  fontFamily: '"Garamond", "Georgia", "Times New Roman", serif', // Script-style font
  color: '#4b0082', // Deep purple
  textShadow: `0 0 8px ${theme.palette.secondary.main}`,
}));
