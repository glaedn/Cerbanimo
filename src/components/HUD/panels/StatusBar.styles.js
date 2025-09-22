import { styled } from '@mui/material/styles';

export const StatusBarContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '5px 15px',
  backgroundColor: 'rgba(10, 10, 46, 0.9)', // This could be a theme variable
  borderTop: `1px solid ${theme.palette.primary.main}`,
  position: 'absolute',
  bottom: '60px',
  left: 0,
  width: '100%',
  boxSizing: 'border-box',
  height: '45px',
}));

export const StatusItem = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: theme.palette.text.primary,
}));

export const Username = styled('span')(({ theme }) => ({
  fontSize: '1.1em',
  color: theme.palette.primary.main,
}));

export const Level = styled('span')(({ theme }) => ({
  fontSize: '0.9em',
  fontFamily: theme.typography.fontFamilyAccent,
  backgroundColor: 'rgba(0, 243, 255, 0.2)', // Another candidate for a theme variable
  padding: '2px 5px',
  borderRadius: theme.shape.borderRadius,
}));

export const TokensInfo = styled('div')({
  fontSize: '1em',
});

export const NotificationsInfo = styled('div')(({ theme }) => ({
  '.notification-icon': {
    fontSize: '1.2em',
  },
  '.notification-count': {
    fontFamily: theme.typography.fontFamilyAccent,
    fontWeight: 'bold',
    marginLeft: '-5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
}));
