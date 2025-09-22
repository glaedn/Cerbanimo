import { styled } from '@mui/material/styles';

export const MagicalGirlHUDContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 'calc(100vh - 60px)',
  overflow: 'hidden',
  background: theme.palette.background.default,
  fontFamily: theme.typography.fontFamilyBase,
}));

export const PanelWrapper = styled('div')({
  position: 'absolute',
  zIndex: 10,
  transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  opacity: 1,
  transform: 'scale(1)',
  '&.hidden': {
    opacity: 0,
    transform: 'scale(0.95)',
    pointerEvents: 'none',
  },
});

export const InnerSanctumPanel = styled(PanelWrapper)({
  top: '20px',
  left: '20px',
});

export const MysticalMirrorPanel = styled(PanelWrapper)({
  top: '20px',
  right: '20px',
});

export const QuestsPanel = styled(PanelWrapper)({
  bottom: '20px',
  left: '20px',
});

export const AstrasJournalPanel = styled(PanelWrapper)({
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
});

export const AffinityWebPanel = styled(PanelWrapper)({
  bottom: '20px',
  right: '20px',
});

export const MapViewort = styled('div')(({ theme }) => ({
  boxSizing: 'border-box',
  border: `2px solid ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: `0 0 20px ${theme.palette.primary.main}, inset 0 0 20px ${theme.palette.primary.main}`,
  position: 'absolute',
  top: '150px',
  bottom: '150px',
  left: '250px',
  right: '250px',
  background: 'rgba(255, 182, 193, 0.1)',
  backdropFilter: 'blur(5px)',
}));

export const StatusBarWrapper = styled('div')({
  width: 'calc(100% - 40px)',
  position: 'absolute',
  bottom: '10px',
  left: '20px',
  zIndex: 10,
});
