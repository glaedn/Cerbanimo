const theme = {
  colors: {
    backgroundDefault: '#030612',
    backgroundPaper: '#081429',
    backgroundBlack: '#000000',
    primary: '#5FF0FF',
    secondary: '#FF5CA2', // neon pink, from ProjectVisualizer tabs/nodes
    accentGreen: '#7DFFB1',
    accentBlue: '#7FA8FF',
    accentOrange: '#FFCE6A',
    accentPurple: '#B99CFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: 'rgba(95, 240, 255, 0.34)',
    error: '#FF4136', // a generic neon red for errors
    success: '#32CD32', // green, for success states
    warning: '#FFA500', // orange, for warnings
    info: '#4DABF7', // blue, for info
  },
  typography: {
    fontFamilyBase: "'Inter', sans-serif",
    fontFamilyAccent: "'Orbitron', sans-serif",
    fontSizeXs: '0.75rem', // 12px
    fontSizeSm: '0.875rem', // 14px
    fontSizeMd: '1rem',     // 16px
    fontSizeLg: '1.25rem',  // 20px
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  spacing: { // using a base of 8px
    unit: 8,
    xs: '0.5rem', // 4px
    sm: '1rem',   // 8px
    md: '1.5rem', // 12px
    lg: '2rem',   // 16px
    xl: '3rem',   // 24px
  },
  borders: {
    borderRadiusSm: '4px',
    borderRadiusMd: '8px',
    borderRadiusLg: '12px',
    borderWidth: '1px',
  },
  transitions: {
    short: '0.15s',
    medium: '0.3s',
    easing: 'ease-in-out',
  },
  effects: {
    glowStrong: (color) => `0 0 15px ${color}`,
    glowSubtle: (color) => `0 0 10px ${color}7A`, // 7A for ~0.5 alpha
    glass: { backdropFilter: 'blur(16px)', backgroundColor: 'rgba(5, 16, 34, 0.72)' },
  },
};

export default theme;
