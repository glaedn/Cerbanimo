import { styled } from '@mui/material/styles';
import dashboardBackground from '../../assets/magical-girl/dashboard-background.jpg';

export const MagicalGirlHUDContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 'calc(100vh - 60px)',
  overflow: 'hidden',
  background: `url(${dashboardBackground}) no-repeat center center fixed`,
  backgroundSize: 'cover',
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

export const MapViewort = styled('div')(({ theme, isExpanded }) => ({
  boxSizing: 'border-box',
  border: `2px solid ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: `0 0 20px ${theme.palette.primary.main}, inset 0 0 20px ${theme.palette.primary.main}`,
  position: 'absolute',
  transition: 'all 0.5s ease-in-out',
  background: 'rgba(255, 182, 193, 0.1)',
  backdropFilter: 'blur(5px)',
  cursor: isExpanded ? 'default' : 'pointer',

  // Minimized state
  top: isExpanded ? '0' : '50%',
  left: isExpanded ? '0' : '50%',
  width: isExpanded ? '100%' : '200px',
  height: isExpanded ? '100%' : '200px',
  transform: isExpanded ? 'translate(0, 0)' : 'translate(-50%, -50%)',

  // Expanded state
  '&.expanded': {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    cursor: 'default',
  }
}));

export const MapToggleButton = styled('button')(({ theme }) => ({
  position: 'absolute',
  top: '10px',
  right: '10px',
  zIndex: 20,
  background: theme.palette.secondary.main,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: '5px',
  padding: '5px 10px',
  cursor: 'pointer',
  '&:hover': {
    background: theme.palette.primary.main,
    boxShadow: `0 0 15px ${theme.palette.primary.main}`,
  }
}));

export const StatusBarWrapper = styled('div')({
  width: 'calc(100% - 40px)',
  position: 'absolute',
  bottom: '10px',
  left: '20px',
  zIndex: 10,
});
