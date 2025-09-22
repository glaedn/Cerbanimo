const magicalGirlTheme = {
  colors: {
    // Primary Palette
    lavender: '#E6E6FA',
    blushPink: '#FFB6C1',
    aqua: '#7FFFD4',
    peach: '#FFDAB9',

    // Accent Palette
    neonPurple: '#BF00FF',
    brightCyan: '#00FFFF',
    starGold: '#FFD700',

    // Functional Colors
    primary: '#FFB6C1', // Blush Pink as main primary
    secondary: '#7FFFD4', // Aqua as main secondary

    // Backgrounds
    backgroundDefault: 'linear-gradient(180deg, #0A0A2E 0%, #2E1A47 50%, #000000 100%)', // Deep Navy -> Violet -> Black
    backgroundPaper: 'rgba(255, 182, 193, 0.1)', // Semi-transparent blush pink

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#E6E6FA', // Lavender for secondary text

    // Other
    border: '#FFB6C1',
    error: '#FF69B4', // Hot Pink for errors
    success: '#7FFFD4', // Aqua for success
    warning: '#FFD700', // Star-gold for warnings
    info: '#87CEEB', // Sky Blue for info
  },
  typography: {
    fontFamilyBase: "'Nunito', sans-serif",
    fontFamilyAccent: "'Quicksand', sans-serif",
    fontFamilyScript: "'Dancing Script', cursive", // Placeholder for magical callouts
    fontSizeXs: '0.75rem',
    fontSizeSm: '0.875rem',
    fontSizeMd: '1rem',
    fontSizeLg: '1.25rem',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
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
    borderRadiusSm: '8px',
    borderRadiusMd: '16px',
    borderRadiusLg: '24px', // 2xl radius
    borderWidth: '2px', // A bit thicker for effect
  },
  transitions: {
    short: '0.2s',
    medium: '0.4s',
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', // Bouncy, magical feel
  },
  effects: {
    glowStrong: (color) => `0 0 20px ${color}, 0 0 10px ${color}`,
    glowSubtle: (color) => `0 0 8px ${color}99`,
    outerGlow: '0 0 15px rgba(255, 182, 193, 0.5)', // Soft blush pink outer glow
    textShadow: '0 0 5px #FFFFFF, 0 0 10px #FFFFFF, 0 0 15px #FFB6C1',
  },
  animations: {
    sparkle: 'sparkle 1.5s infinite',
    gradientPan: 'gradientPan 10s ease infinite',
  }
};

export default magicalGirlTheme;
