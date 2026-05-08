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
    backgroundDefault: '#0A0A2E',
    backgroundPaper: '#1C1C1E',
    backgroundBlack: '#000000',
    primary: '#00F3FF',
    secondary: '#FF5CA2',
    accentGreen: '#00D787',
    accentBlue: '#4DABF7',
    accentOrange: '#FF9F40',
    accentPurple: '#9C27B0',
    textPrimary: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#444444',
    error: '#FF4136',
    success: '#32CD32',
    warning: '#FFA500',
    info: '#4DABF7',
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
    glowSubtle: (color) => `0 0 10px ${color}7A`,
    glass: { backdropFilter: 'blur(10px)', backgroundColor: 'rgba(28, 28, 30, 0.75)' },
  },
};

export default theme;
