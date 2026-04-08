import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const useIsMobile = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};
