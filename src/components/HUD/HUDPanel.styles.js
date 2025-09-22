import { styled } from '@mui/material/styles';

export const HUDPanelContainer = styled('div')(({ theme }) => ({
  backgroundColor: 'rgba(10, 10, 46, 0.8)', // Candidate for theme variable
  border: `1px solid ${theme.palette.primary.main}`,
  boxShadow: theme.effects.glowSubtle(theme.palette.primary.main),
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.text.primary,
  padding: '15px',
  margin: '5px',
  fontFamily: theme.typography.fontFamilyBase,
  maxHeight: '400px',
  overflowY: 'auto',
  overflowX: 'hidden',
  transition: 'max-height 0.3s ease-in-out, padding 0.3s ease-in-out',
  boxSizing: 'border-box',
}));

export const HUDPanelHeader = styled('div')(({ theme }) => ({
  backgroundColor: 'rgba(255, 92, 162, 0.3)', // Candidate for theme variable
  padding: '8px 10px',
  cursor: 'pointer',
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  borderBottom: `1px solid ${theme.palette.secondary.main}`,
  margin: '-15px -15px 10px -15px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

export const HUDPanelTitle = styled('h4')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  color: theme.palette.primary.main,
  textShadow: `0 0 5px ${theme.palette.primary.main}`,
  marginTop: 0,
  marginBottom: '10px',
  borderBottom: `1px solid ${theme.palette.secondary.main}`,
  paddingBottom: '8px',
  fontSize: '1.2em',
}));

export const HUDPanelList = styled('ul')({
  listStyleType: 'none',
  paddingLeft: 0,
  margin: 0,
});

export const HUDPanelListItem = styled('li')(({ theme }) => ({
  padding: '6px 0',
  borderBottom: `1px dashed ${theme.palette.primary.main}33`,
  fontSize: '0.9em',
  '&:last-child': {
    borderBottom: 'none',
  },
  '&:hover': {
    backgroundColor: `${theme.palette.primary.main}1A`,
  },
}));

export const HUDPanelButton = styled('button')(({ theme }) => ({
  fontFamily: theme.typography.fontFamilyAccent,
  backgroundColor: 'transparent',
  color: theme.palette.secondary.main,
  border: `1px solid ${theme.palette.secondary.main}`,
  padding: '5px 10px',
  borderRadius: theme.shape.borderRadius,
  boxShadow: `0 0 8px ${theme.palette.secondary.main}B3`,
  transition: 'background-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out, color 0.15s ease-in-out, border-color 0.15s ease-in-out',
  cursor: 'pointer',
  outline: 'none',
  '&:hover': {
    backgroundColor: `${theme.palette.secondary.main}33`,
    boxShadow: `0 0 12px ${theme.palette.secondary.main}`,
  },
}));
