import { styled } from '@mui/material/styles';

export const HUDContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  top: 0,
  width: '100%',
  height: 'calc(100vh - 60px)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  background: theme.palette.background.default,
}));

export const PanelWrapper = styled('div')({
  position: 'absolute',
  zIndex: 10,
  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
  opacity: 1,
  transform: 'scale(1)',
  '&.hidden': {
    opacity: 0,
    transform: 'scale(0.95)',
    pointerEvents: 'none',
  },
});

export const CommandDeckPanel = styled(PanelWrapper)({
  top: '10px',
  left: '10px',
});

export const TargetingScannerPanel = styled(PanelWrapper)({
  top: '10px',
  right: '10px',
});

export const MissionConsolePanel = styled(PanelWrapper)({
  bottom: '50px',
  left: '10px',
});

export const CommsLogPanel = styled(PanelWrapper)({
  bottom: '50px',
  left: '50%',
  transform: 'translateX(-50%)',
});

export const AffinityGalaxyPanelWrapper = styled(PanelWrapper)({
  bottom: '50px',
  right: '10px',
  maxWidth: '300px',
  maxHeight: '40vh',
});

export const HUDMapViewort = styled('div')(({ theme }) => ({
  boxSizing: 'border-box',
  border: `2px solid ${theme.palette.primary.main}`,
  boxShadow: `0 0 15px ${theme.palette.primary.main}, inset 0 0 15px ${theme.palette.primary.main}`,
  maxWidth: '1600px',
  maxHeight: '1000px',
  position: 'absolute',
  top: '70px',
  bottom: '115px',
  left: '220px',
  right: '220px',
  background: 'rgba(0,0,0,0.1)',
}));

export const StatusBarWrapper = styled('div')({
  width: 'calc(100% - 20px)',
  position: 'absolute',
  bottom: '0px',
  left: '10px',
  zIndex: 10,
  boxSizing: 'border-box',
});
