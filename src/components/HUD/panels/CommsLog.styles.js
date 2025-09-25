import { styled } from '@mui/material/styles';
import {
  HUDPanelContainer,
  HUDPanelHeader,
  HUDPanelTitle,
  HUDPanelList,
  HUDPanelListItem,
} from '../HUDPanel.styles';

export const CommsLogContainer = styled(HUDPanelContainer)({
  // Add any specific styles for CommsLog here
});

export const LogItem = styled(HUDPanelListItem)({
  color: 'inherit',
});
