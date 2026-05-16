const theme = {
  tokens: {
    colors: {
      brand: {
        primary: '#00F3FF', // Neon Cyan
        secondary: '#FF5CA2', // Neon Pink
        accent: '#00D787', // Neon Green
      },
      surface: {
        background: '#0A0A2E',
        paper: '#1C1C1E',
        overlay: 'rgba(28, 28, 30, 0.75)',
      },
      status: {
        urgency: {
          critical: '#FF4136',
          high: '#FF851B',
          medium: '#FFDC00',
          low: '#2ECC40',
        },
        governance: {
          active: '#0074D9',
          passed: '#2ECC40',
          failed: '#FF4136',
          pending: '#AAAAAA',
        },
        crisis: '#FF0000',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#CCCCCC',
        muted: '#888888',
      }
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    glow: {
      primary: '0 0 15px rgba(0, 243, 255, 0.6)',
      secondary: '0 0 15px rgba(255, 92, 162, 0.6)',
      critical: '0 0 20px rgba(255, 65, 54, 0.8)',
    },
    motion: {
      standard: '0.3s ease-in-out',
      fast: '0.15s ease-in-out',
    }
  },
  // Legacy compatibility mapping
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
    fontSizeXs: '0.75rem',
    fontSizeSm: '0.875rem',
    fontSizeMd: '1rem',
    fontSizeLg: '1.25rem',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  spacing: {
    unit: 8,
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
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
