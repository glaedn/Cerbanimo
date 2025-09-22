import { styled } from '@mui/material/styles';
import {
  HUDPanelContainer,
  HUDPanelHeader,
  HUDPanelTitle,
  HUDPanelList,
  HUDPanelListItem,
  HUDPanelButton,
} from '../HUDPanel.styles';

export const MissionConsoleContainer = styled(HUDPanelContainer)({
  // Add any specific styles for MissionConsole here
});

export const QuestItem = styled(HUDPanelListItem)({
  // Styles for individual quest items
});

export const QuestTitle = styled('span')({
  fontWeight: 'bold',
});

export const QuestDetails = styled('span')({
  fontSize: '0.8em',
  color: '#ccc',
});

export const QuestActions = styled('div')({
  marginTop: '8px',
  display: 'flex',
  gap: '8px',
});

export const ActionButton = styled(HUDPanelButton)({
  fontSize: '0.8em',
  padding: '3px 7px',
});
