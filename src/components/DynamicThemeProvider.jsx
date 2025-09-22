import React from 'react';
import { useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import muiTheme from '../styles/muiTheme';
import muiMagicalGirlTheme from '../styles/muiMagicalGirlTheme';
import globalStyles from '../styles/globalStyles';

const themeMap = {
  default: muiTheme,
  magicalGirl: muiMagicalGirlTheme,
};

const DynamicThemeProvider = ({ children }) => {
  const themeMode = useSelector((state) => state.theme.mode);
  const theme = themeMap[themeMode] || muiTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={themeMode === 'magicalGirl' ? globalStyles : {}} />
      {children}
    </ThemeProvider>
  );
};

export default DynamicThemeProvider;
